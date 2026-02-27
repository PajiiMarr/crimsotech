// app/routes/admin/view_boosts/view_boost.tsx
import type { Route } from "./+types/view_boost"
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
import { Separator } from '~/components/ui/separator';
import { 
  Store, 
  User, 
  Package, 
  AlertCircle,
  Star,
  MapPin,
  Shield,
  Eye,
  Ban,
  XCircle,
  CheckCircle,
  ChevronLeft,
  MoreVertical,
  Calendar,
  Tag,
  Box,
  TrendingUp,
  Image as ImageIcon,
  Clock,
  Hash,
  DollarSign,
  Zap,
  CreditCard,
  FileText,
  Download,
  ExternalLink,
  RefreshCw,
  PauseCircle,
  PlayCircle,
  ArrowLeft
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

export function meta(): Route.MetaDescriptors {
  return [
    {
      title: "Boost Details | Admin",
    }
  ]
}

interface BoostDetails {
  id: string;
  boost_id?: string;
  status: 'active' | 'pending' | 'expired' | 'cancelled' | 'suspended' | 'completed';
  payment_method?: string;
  payment_verified: boolean;
  has_receipt: boolean;
  receipt_url?: string;
  start_date?: string;
  end_date?: string;
  created_at: string;
  days_remaining?: number;
  amount?: number;
  price?: number;
  
  // Product details
  product?: {
    id: string;
    name: string;
    description: string;
    image?: string;
    total_stock: number;
    price_range?: {
      min: number;
      max: number;
    };
    condition?: string;
    status?: string;
    upload_status?: string;
    category?: string;
    shop_id?: string;
  };
  
  // Shop details
  shop?: {
    id: string;
    name: string;
    description?: string;
    city: string;
    province: string;
    street?: string;
    barangay?: string;
    contact_number?: string;
    verified?: boolean;
    shop_picture?: string | null;
  };
  
  // Customer details
  customer?: {
    id: string;
    name: string;
    email: string;
    contact_number?: string;
    username?: string;
    first_name?: string;
    last_name?: string;
  };
  
  // Plan details
  plan?: {
    id: string;
    name: string;
    price: number;
    duration: number;
    time_unit: string;
    description?: string;
    features?: Array<{
      id: string;
      feature_name: string;
      value?: string;
    }>;
  };
  
  // Verification details
  verification?: {
    verified: boolean;
    verified_at?: string;
    verified_by?: string;
    verified_by_name?: string;
  };
  
  // Action history
  actions?: Array<{
    id: string;
    action_type: string;
    performed_by?: string;
    performed_at: string;
    reason?: string;
    notes?: string;
  }>;
}

interface LoaderData {
  user: any;
  boostId: string;
}

export async function loader({ request, context, params }: Route.LoaderArgs): Promise<LoaderData> {
  const { registrationMiddleware } = await import("~/middleware/registration.server");
  await registrationMiddleware({ request, context, params: {}, unstable_pattern: undefined } as any);
  const { requireRole } = await import("~/middleware/role-require.server");
  const { fetchUserRole } = await import("~/middleware/role.server");

  let user = (context as any).user;
  if (!user) {
    user = await fetchUserRole({ request, context });
  }

  await requireRole(request, context, ["isAdmin"]);

  // Get session for authentication
  const { getSession } = await import('~/sessions.server');
  const session = await getSession(request.headers.get("Cookie"));
  
  const boostId = params.boost_id as string;

  return { user, boostId };
}

// Helper function to normalize status
const normalizeBoostStatus = (status: string): string => {
  if (!status) return 'Unknown';
  const lowerStatus = status.toLowerCase();
  
  switch (lowerStatus) {
    case 'active':
      return 'Active';
    case 'expired':
      return 'Expired';
    case 'pending':
      return 'Pending';
    case 'cancelled':
      return 'Cancelled';
    case 'suspended':
      return 'Suspended';
    case 'completed':
      return 'Completed';
    default:
      return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  }
};

// Get boost status badge config
const getBoostStatusConfig = (status: string) => {
  const normalizedStatus = normalizeBoostStatus(status);
  
  switch (normalizedStatus) {
    case 'Active':
      return {
        variant: 'default' as const,
        className: 'bg-green-50 text-green-700 border-green-200',
        icon: PlayCircle,
        iconClassName: 'text-green-600'
      };
    case 'Pending':
      return {
        variant: 'secondary' as const,
        className: 'bg-yellow-50 text-yellow-700 border-yellow-200',
        icon: Clock,
        iconClassName: 'text-yellow-600'
      };
    case 'Expired':
      return {
        variant: 'outline' as const,
        className: 'bg-gray-50 text-gray-700 border-gray-200',
        icon: XCircle,
        iconClassName: 'text-gray-600'
      };
    case 'Cancelled':
      return {
        variant: 'destructive' as const,
        className: 'bg-red-50 text-red-700 border-red-200',
        icon: XCircle,
        iconClassName: 'text-red-600'
      };
    case 'Suspended':
      return {
        variant: 'destructive' as const,
        className: 'bg-amber-50 text-amber-700 border-amber-200',
        icon: Ban,
        iconClassName: 'text-amber-600'
      };
    case 'Completed':
      return {
        variant: 'default' as const,
        className: 'bg-blue-50 text-blue-700 border-blue-200',
        icon: CheckCircle,
        iconClassName: 'text-blue-600'
      };
    default:
      return {
        variant: 'secondary' as const,
        className: 'bg-gray-50 text-gray-700 border-gray-200',
        icon: AlertCircle,
        iconClassName: 'text-gray-600'
      };
  }
};

// Boost Status Badge Component
function BoostStatusBadge({ status }: { status: string }) {
  const config = getBoostStatusConfig(status);
  const Icon = config.icon;
  
  return (
    <Badge 
      variant={config.variant} 
      className={`flex items-center gap-1.5 px-3 py-1 ${config.className}`}
    >
      <Icon className={`w-3.5 h-3.5 ${config.iconClassName}`} />
      {normalizeBoostStatus(status)}
    </Badge>
  );
}

// Action configurations
const actionConfigs = {
  approve: {
    title: "Approve Boost",
    description: "Are you sure you want to approve this boost? This will activate the boost and charge the customer.",
    confirmText: "Approve",
    variant: "default" as const,
    icon: CheckCircle,
    needsReason: false,
    needsSuspensionDays: false,
  },
  reject: {
    title: "Reject Boost",
    description: "Are you sure you want to reject this boost? The customer will be notified.",
    confirmText: "Reject",
    variant: "destructive" as const,
    icon: XCircle,
    needsReason: true,
    needsSuspensionDays: false,
  },
  suspend: {
    title: "Suspend Boost",
    description: "This will suspend the boost temporarily. The product will no longer be boosted.",
    confirmText: "Suspend",
    variant: "destructive" as const,
    icon: Ban,
    needsReason: true,
    needsSuspensionDays: true,
  },
  resume: {
    title: "Resume Boost",
    description: "This will resume the suspended boost and continue the boosting period.",
    confirmText: "Resume",
    variant: "default" as const,
    icon: PlayCircle,
    needsReason: false,
    needsSuspensionDays: false,
  },
  cancel: {
    title: "Cancel Boost",
    description: "Are you sure you want to cancel this boost? This action cannot be undone.",
    confirmText: "Cancel",
    variant: "destructive" as const,
    icon: XCircle,
    needsReason: true,
    needsSuspensionDays: false,
  },
  renew: {
    title: "Renew Boost",
    description: "This will renew the expired boost for another period.",
    confirmText: "Renew",
    variant: "default" as const,
    icon: RefreshCw,
    needsReason: false,
    needsSuspensionDays: false,
  },
  restore: {
    title: "Restore Boost",
    description: "This will restore the cancelled boost and make it active again.",
    confirmText: "Restore",
    variant: "default" as const,
    icon: RefreshCw,
    needsReason: false,
    needsSuspensionDays: false,
  },
};

// Format date helper
const formatDate = (dateString?: string) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Format currency
const formatCurrency = (amount?: number) => {
  if (amount === undefined || amount === null) return '₱0.00';
  return `₱${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export default function ViewBoost({ loaderData }: { loaderData: LoaderData }) {
  const { user, boostId } = loaderData;
  const params = useParams();
  
  const [boost, setBoost] = useState<BoostDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [reason, setReason] = useState("");
  const [suspensionDays, setSuspensionDays] = useState(7);
  const [processing, setProcessing] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  const isMobile = useIsMobile();
  const { toast } = useToast();

  useEffect(() => {
    fetchBoostDetails();
  }, [boostId]);

  const fetchBoostDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await AxiosInstance.get(`/admin-boosting/get_boost_details/${boostId}/`);
      
      if (response.data.success) {
        const data = response.data.boost || response.data;
        
        // Transform the data to match our interface
        const transformedBoost: BoostDetails = {
          id: data.id || data.boost_id || boostId,
          boost_id: data.boost_id || data.id,
          status: data.status || 'pending',
          payment_method: data.payment_method,
          payment_verified: data.payment_verified || false,
          has_receipt: data.has_receipt || !!data.receipt_url,
          receipt_url: data.receipt_url,
          start_date: data.start_date,
          end_date: data.end_date,
          created_at: data.created_at || data.createdAt,
          days_remaining: data.days_remaining,
          amount: data.amount || data.price,
          price: data.price || data.amount,
          
          product: data.product ? {
            id: data.product.id,
            name: data.product.name,
            description: data.product.description,
            image: data.product.image,
            total_stock: data.product.total_stock || 0,
            price_range: data.product.price_range,
            condition: data.product.condition,
            status: data.product.status,
            upload_status: data.product.upload_status,
            category: data.product.category,
            shop_id: data.product.shop_id
          } : undefined,
          
          shop: data.shop ? {
            id: data.shop.id,
            name: data.shop.name,
            description: data.shop.description,
            city: data.shop.city,
            province: data.shop.province,
            street: data.shop.street,
            barangay: data.shop.barangay,
            contact_number: data.shop.contact_number,
            verified: data.shop.verified,
            shop_picture: data.shop.shop_picture
          } : undefined,
          
          customer: data.customer ? {
            id: data.customer.id,
            name: data.customer.name || `${data.customer.first_name || ''} ${data.customer.last_name || ''}`.trim() || data.customer.username,
            email: data.customer.email,
            contact_number: data.customer.contact_number,
            username: data.customer.username,
            first_name: data.customer.first_name,
            last_name: data.customer.last_name
          } : undefined,
          
          plan: data.plan ? {
            id: data.plan.id,
            name: data.plan.name,
            price: data.plan.price,
            duration: data.plan.duration,
            time_unit: data.plan.time_unit,
            description: data.plan.description,
            features: data.plan.features
          } : undefined,
          
          verification: data.verification ? {
            verified: data.verification.verified,
            verified_at: data.verification.verified_at,
            verified_by: data.verification.verified_by,
            verified_by_name: data.verification.verified_by_name
          } : undefined,
          
          actions: data.actions
        };
        
        setBoost(transformedBoost);
      } else {
        setError(response.data.error || 'Failed to load boost details');
      }
    } catch (error: any) {
      console.error('Error fetching boost details:', error);
      setError(error.response?.data?.error || 'Failed to load boost details');
    } finally {
      setLoading(false);
    }
  };

  // Function to refresh data
  const refreshData = async () => {
    await fetchBoostDetails();
  };

  // Determine available actions based on boost status
  const getAvailableActions = () => {
    if (!boost) return [];
    
    const normalizedStatus = normalizeBoostStatus(boost.status);
    const actions = [];
    
    // Pending boosts
    if (normalizedStatus === 'Pending') {
      actions.push(
        {
          id: "approve",
          label: "Approve Boost",
          icon: CheckCircle,
          variant: "default" as const,
        },
        {
          id: "reject",
          label: "Reject Boost",
          icon: XCircle,
          variant: "destructive" as const,
        }
      );
    }
    
    // Active boosts
    if (normalizedStatus === 'Active') {
      actions.push(
        {
          id: "suspend",
          label: "Suspend Boost",
          icon: Ban,
          variant: "destructive" as const,
        },
        {
          id: "cancel",
          label: "Cancel Boost",
          icon: XCircle,
          variant: "destructive" as const,
        }
      );
    }
    
    // Suspended boosts
    if (normalizedStatus === 'Suspended') {
      actions.push(
        {
          id: "resume",
          label: "Resume Boost",
          icon: PlayCircle,
          variant: "default" as const,
        },
        {
          id: "cancel",
          label: "Cancel Boost",
          icon: XCircle,
          variant: "destructive" as const,
        }
      );
    }
    
    // Expired boosts
    if (normalizedStatus === 'Expired') {
      actions.push({
        id: "renew",
        label: "Renew Boost",
        icon: RefreshCw,
        variant: "default" as const,
      });
    }
    
    // Cancelled boosts
    if (normalizedStatus === 'Cancelled') {
      actions.push({
        id: "restore",
        label: "Restore Boost",
        icon: RefreshCw,
        variant: "default" as const,
      });
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
    if (!activeAction || !boost) return;
    
    // Validate required reason for reject, suspend, cancel actions
    if ((activeAction === 'reject' || activeAction === 'suspend' || activeAction === 'cancel') && !reason.trim()) {
      toast({
        title: "Validation Error",
        description: "Please provide a reason for this action",
        variant: "destructive",
      });
      return;
    }
    
    setProcessing(true);
    try {
      const requestData: any = {
        boost_id: boost.id,
        action_type: activeAction,
        user_id: user?.id
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
        '/admin-boosting/update_boost_status/',
        requestData,
        {
          headers: {
            "X-User-Id": user?.id || ''
          }
        }
      );
      
      toast({
        title: "Success",
        description: response.data.message || "Boost status updated successfully",
        variant: "success",
      });
      
      // Refresh data
      await refreshData();
      
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

  const renderDialogContent = () => {
    if (!currentAction || !boost) return null;

    return (
      <>
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">{currentAction.title}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {currentAction.description}
            </p>
          </div>
          
          {/* Boost info */}
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-sm font-medium">Boost ID: {boost.boost_id || boost.id.slice(0, 8)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Current Status: {normalizeBoostStatus(boost.status)}
            </p>
            {boost.product && (
              <p className="text-xs text-muted-foreground mt-1">
                Product: {boost.product.name}
              </p>
            )}
          </div>
          
          {/* Reason input for actions that need it */}
          {(activeAction === 'reject' || activeAction === 'suspend' || activeAction === 'cancel') && (
            <div className="space-y-2">
              <Label htmlFor="reason" className="text-sm font-medium">
                Reason <span className="text-red-500">*</span>
              </Label>
              <Input
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={`Please provide a reason for ${activeAction}ing this boost...`}
                className="h-10"
                required
              />
              <p className="text-xs text-muted-foreground">
                This reason will be recorded and may be shared with the seller.
              </p>
            </div>
          )}
          
          {/* Suspension days for suspend action */}
          {activeAction === 'suspend' && (
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
                The boost will be automatically resumed after this period.
              </p>
            </div>
          )}
          
          {/* Warning message for destructive actions */}
          {currentAction.variant === "destructive" && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3">
              <p className="text-sm font-medium text-destructive flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                Warning: This action may have consequences
              </p>
            </div>
          )}
        </div>
      </>
    );
  };

  const renderDesktopDialog = () => {
    if (!currentAction || !boost) return null;

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
              disabled={processing || ((activeAction === 'reject' || activeAction === 'suspend' || activeAction === 'cancel') && !reason.trim())}
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
    if (!currentAction || !boost) return null;

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
              disabled={processing || ((activeAction === 'reject' || activeAction === 'suspend' || activeAction === 'cancel') && !reason.trim())}
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

  if (loading) {
    return (
      <UserProvider user={user}>
        <div className="container mx-auto p-4 sm:p-6">
          <div className="flex items-center gap-4 mb-6">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/admin/boosting">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Link>
            </Button>
            <div className="h-8 w-48 bg-gray-200 animate-pulse rounded" />
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <div className="h-6 w-32 bg-gray-200 animate-pulse rounded mb-2" />
                  <div className="h-4 w-48 bg-gray-200 animate-pulse rounded" />
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="h-20 w-full bg-gray-200 animate-pulse rounded" />
                  <div className="h-20 w-full bg-gray-200 animate-pulse rounded" />
                </CardContent>
              </Card>
            </div>
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="h-6 w-32 bg-gray-200 animate-pulse rounded" />
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="h-10 w-full bg-gray-200 animate-pulse rounded" />
                  <div className="h-10 w-full bg-gray-200 animate-pulse rounded" />
                  <div className="h-10 w-full bg-gray-200 animate-pulse rounded" />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </UserProvider>
    );
  }

  if (error || !boost) {
    return (
      <UserProvider user={user}>
        <div className="container mx-auto p-4 sm:p-6">
          <div className="flex flex-col items-center justify-center py-12">
            <div className="rounded-full bg-red-100 p-4 mb-4">
              <AlertCircle className="h-12 w-12 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Boost Not Found</h2>
            <p className="text-muted-foreground mb-6">{error || 'The boost you\'re looking for doesn\'t exist.'}</p>
            <Button asChild>
              <Link to="/admin/boosting">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Boosts
              </Link>
            </Button>
          </div>
        </div>
      </UserProvider>
    );
  }

  const StatusIcon = getBoostStatusConfig(boost.status).icon;
  const statusConfig = getBoostStatusConfig(boost.status);

  return (
    <UserProvider user={user}>
      <TooltipProvider>
        <div className="container mx-auto p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
          {/* Header with back button and actions */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/admin/boosting">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Link>
              </Button>
              <h1 className="text-2xl sm:text-3xl font-bold">Boost Details</h1>
            </div>
            
            {/* Admin Actions Dropdown */}
            {availableActions.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="ml-auto">
                    <MoreVertical className="w-4 h-4 mr-2" />
                    Actions
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
                          className={`flex items-center gap-2 cursor-pointer ${
                            isDestructive 
                              ? "text-destructive focus:text-destructive" 
                              : ""
                          }`}
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

          {/* Status Banner */}
          <Card className={`${statusConfig.className} border-2`}>
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-white/50">
                    <StatusIcon className={`h-6 w-6 ${statusConfig.iconClassName}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="text-xl font-semibold">Boost #{boost.boost_id || boost.id.slice(0, 8)}</h2>
                      <BoostStatusBadge status={boost.status} />
                    </div>
                    <p className="text-sm opacity-80">
                      Created on {formatDate(boost.created_at)}
                    </p>
                  </div>
                </div>
                
                <div className="text-left sm:text-right">
                  <p className="text-sm opacity-80">Amount</p>
                  <p className="text-2xl font-bold">{formatCurrency(boost.amount || boost.plan?.price)}</p>
                  {boost.payment_verified && (
                    <Badge variant="default" className="mt-1 bg-green-600">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Payment Verified
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Main Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Product Details Card */}
              {boost.product && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Package className="h-5 w-5" />
                      Product Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col sm:flex-row gap-4">
                      {/* Product Image */}
                      <div className="sm:w-32 sm:h-32 w-full h-48 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {boost.product.image ? (
                          <img 
                            src={boost.product.image} 
                            alt={boost.product.name}
                            className="w-full h-full object-cover cursor-pointer"
                            onClick={() => setSelectedImage(boost.product?.image || null)}
                          />
                        ) : (
                          <ImageIcon className="h-12 w-12 text-gray-400" />
                        )}
                      </div>
                      
                      {/* Product Info */}
                      <div className="flex-1 space-y-3">
                        <div>
                          <Link 
                            to={`/admin/products/${boost.product.id}`}
                            className="text-lg font-semibold hover:underline flex items-center gap-1"
                          >
                            {boost.product.name}
                            <ExternalLink className="h-3 w-3 ml-1" />
                          </Link>
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                            {boost.product.description}
                          </p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          {boost.product.price_range && (
                            <div>
                              <span className="text-muted-foreground">Price Range:</span>
                              <span className="ml-2 font-medium">
                                {formatCurrency(boost.product.price_range.min)} - {formatCurrency(boost.product.price_range.max)}
                              </span>
                            </div>
                          )}
                          <div>
                            <span className="text-muted-foreground">Stock:</span>
                            <span className="ml-2 font-medium">{boost.product.total_stock}</span>
                          </div>
                          {boost.product.condition && (
                            <div>
                              <span className="text-muted-foreground">Condition:</span>
                              <span className="ml-2 font-medium">{boost.product.condition}</span>
                            </div>
                          )}
                          {boost.product.category && (
                            <div>
                              <span className="text-muted-foreground">Category:</span>
                              <span className="ml-2 font-medium">{boost.product.category}</span>
                            </div>
                          )}
                        </div>

                        <Button variant="outline" size="sm" asChild className="mt-2">
                          <Link to={`/admin/products/${boost.product.id}`}>
                            <Eye className="h-3 w-3 mr-2" />
                            View Full Product
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Shop Details Card */}
              {boost.shop && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Store className="h-5 w-5" />
                      Shop Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {boost.shop.shop_picture ? (
                            <img 
                              src={boost.shop.shop_picture} 
                              alt={boost.shop.name}
                              className="w-10 h-10 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                              <Store className="w-5 h-5 text-muted-foreground" />
                            </div>
                          )}
                          <div>
                            <Link 
                              to={`/admin/shops/${boost.shop.id}`}
                              className="font-semibold hover:underline flex items-center gap-1"
                            >
                              {boost.shop.name}
                              <ExternalLink className="h-3 w-3 ml-1" />
                            </Link>
                            {boost.shop.description && (
                              <p className="text-xs text-muted-foreground">{boost.shop.description}</p>
                            )}
                          </div>
                        </div>
                        {boost.shop.verified !== undefined && (
                          <Badge variant={boost.shop.verified ? "default" : "secondary"}>
                            {boost.shop.verified ? 'Verified' : 'Unverified'}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        {boost.shop.contact_number && (
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">Contact:</span>
                            <span>{boost.shop.contact_number}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="text-sm">
                            {[boost.shop.street, boost.shop.barangay, boost.shop.city, boost.shop.province]
                              .filter(Boolean)
                              .join(', ')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Customer Details Card */}
              {boost.customer && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <User className="h-5 w-5" />
                      Customer Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <p className="text-lg font-semibold">{boost.customer.name || boost.customer.username}</p>
                        <p className="text-sm text-muted-foreground">ID: {boost.customer.id}</p>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        {boost.customer.email && (
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">Email:</span>
                            <span className="truncate">{boost.customer.email}</span>
                          </div>
                        )}
                        {boost.customer.contact_number && (
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">Contact:</span>
                            <span>{boost.customer.contact_number}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Action History Card */}
              {boost.actions && boost.actions.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Clock className="h-5 w-5" />
                      Action History
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {boost.actions.map((action) => (
                        <div key={action.id} className="flex items-start gap-3 pb-4 border-b last:border-0 last:pb-0">
                          <div className="p-2 rounded-full bg-gray-100">
                            <FileText className="h-4 w-4 text-gray-600" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <p className="font-medium capitalize">{action.action_type.replace('_', ' ')}</p>
                              <p className="text-xs text-muted-foreground">{formatDate(action.performed_at)}</p>
                            </div>
                            {action.performed_by && (
                              <p className="text-xs text-muted-foreground">By: {action.performed_by}</p>
                            )}
                            {action.reason && (
                              <p className="text-sm mt-1 bg-muted/50 p-2 rounded">Reason: {action.reason}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right Column - Sidebar Info */}
            <div className="space-y-6">
              {/* Boost Plan Card */}
              {boost.plan && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Zap className="h-5 w-5" />
                      Boost Plan
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="font-semibold text-base">{boost.plan.name}</p>
                      {boost.plan.description && (
                        <p className="text-sm text-muted-foreground mt-1">{boost.plan.description}</p>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground">Price</p>
                        <p className="font-medium text-base">{formatCurrency(boost.plan.price)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Duration</p>
                        <p className="font-medium">{boost.plan.duration} {boost.plan.time_unit}</p>
                      </div>
                    </div>
                    
                    {boost.plan.features && boost.plan.features.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-2">Features:</p>
                        <ul className="space-y-1">
                          {boost.plan.features.slice(0, 5).map((feature, index) => {
                            // Fix: Handle both string and object features
                            const featureName = typeof feature === 'string' 
                              ? feature 
                              : feature.feature_name || 'Feature';
                            
                            return (
                              <li key={index} className="text-xs flex items-start gap-2">
                                <CheckCircle className="h-3 w-3 text-green-600 mt-0.5 flex-shrink-0" />
                                <span>{featureName}</span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Timeline Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Calendar className="h-5 w-5" />
                    Timeline
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Created:</span>
                      <span className="font-medium">{formatDate(boost.created_at)}</span>
                    </div>
                    {boost.start_date && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Started:</span>
                        <span className="font-medium">{formatDate(boost.start_date)}</span>
                      </div>
                    )}
                    {boost.end_date && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Ends:</span>
                        <span className="font-medium">{formatDate(boost.end_date)}</span>
                      </div>
                    )}
                  </div>
                  
                  {boost.days_remaining !== undefined && boost.status === 'active' && (
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-blue-600" />
                        <span className="text-sm text-blue-700 font-medium">
                          {boost.days_remaining} days remaining
                        </span>
                      </div>
                    </div>
                  )}

                  {boost.status === 'expired' && (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-gray-600" />
                        <span className="text-sm text-gray-700">This boost has expired</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Payment Information Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <DollarSign className="h-5 w-5" />
                    Payment Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Amount:</span>
                      <span className="font-bold text-lg text-primary">
                        {formatCurrency(boost.amount || boost.plan?.price)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Payment Method:</span>
                      <Badge variant="outline" className="font-normal">
                        {boost.payment_method || 'N/A'}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Payment Verified:</span>
                      <Badge variant={boost.payment_verified ? "default" : "secondary"}>
                        {boost.payment_verified ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                  </div>
                  
                  {/* Receipt Section */}
                  {boost.has_receipt && (
                    <div className="pt-3 border-t">
                      <p className="text-sm font-medium mb-3 flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Payment Receipt
                      </p>
                      {boost.receipt_url ? (
                        <div className="flex flex-col sm:flex-row gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1"
                            asChild
                          >
                            <a href={boost.receipt_url} target="_blank" rel="noopener noreferrer">
                              <Eye className="h-4 w-4 mr-2" />
                              View Receipt
                            </a>
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            asChild
                          >
                            <a href={boost.receipt_url} download>
                              <Download className="h-4 w-4" />
                            </a>
                          </Button>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">Receipt uploaded but URL not available</p>
                      )}
                    </div>
                  )}
                  
                  {/* Verification Details */}
                  {boost.verification && boost.verification.verified && (
                    <div className="pt-3 border-t text-sm">
                      <p className="text-muted-foreground">Verified by:</p>
                      <p className="font-medium">{boost.verification.verified_by_name || boost.verification.verified_by}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDate(boost.verification.verified_at)}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Stats Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <TrendingUp className="h-5 w-5" />
                    Quick Stats
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex flex-col items-center p-3 border rounded-lg bg-muted/20 cursor-help">
                          <Box className="w-5 h-5 text-muted-foreground mb-2" />
                          <span className="text-xs text-muted-foreground mb-1">Product Stock</span>
                          <span className="font-semibold text-base">{boost.product?.total_stock || 0}</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Total stock of the boosted product</p>
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex flex-col items-center p-3 border rounded-lg bg-muted/20 cursor-help">
                          <Clock className="w-5 h-5 text-muted-foreground mb-2" />
                          <span className="text-xs text-muted-foreground mb-1">Duration</span>
                          <span className="font-semibold text-base">{boost.plan?.duration || 0} {boost.plan?.time_unit || 'days'}</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Boost plan duration</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Bottom Accordion Sections */}
          <Accordion type="single" collapsible className="w-full">
            {/* Additional Details Accordion */}
            <AccordionItem value="additional-details">
              <AccordionTrigger className="text-base sm:text-lg font-semibold hover:no-underline">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 sm:w-5 sm:h-5" />
                  Additional Details
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="p-4 sm:p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs sm:text-sm text-muted-foreground">Boost ID</p>
                      <p className="font-medium text-sm sm:text-base break-all">{boost.id}</p>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-muted-foreground">Payment Method</p>
                      <p className="font-medium text-sm sm:text-base">{boost.payment_method || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-muted-foreground">Has Receipt</p>
                      <Badge variant={boost.has_receipt ? "default" : "secondary"}>
                        {boost.has_receipt ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                    {boost.start_date && (
                      <div>
                        <p className="text-xs sm:text-sm text-muted-foreground">Start Date</p>
                        <p className="font-medium text-sm sm:text-base">{formatDate(boost.start_date)}</p>
                      </div>
                    )}
                    {boost.end_date && (
                      <div>
                        <p className="text-xs sm:text-sm text-muted-foreground">End Date</p>
                        <p className="font-medium text-sm sm:text-base">{formatDate(boost.end_date)}</p>
                      </div>
                    )}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Boost Plan Features Accordion */}
            {boost.plan?.features && boost.plan.features.length > 0 && (
              <AccordionItem value="plan-features">
                <AccordionTrigger className="text-base sm:text-lg font-semibold hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 sm:w-5 sm:h-5" />
                    Boost Plan Features
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="p-4 sm:p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {boost.plan.features.map((feature, index) => {
                        // Fix: Handle both string and object features
                        const featureName = typeof feature === 'string' 
                          ? feature 
                          : feature.feature_name || 'Feature';
                        
                        const featureValue = typeof feature === 'string' 
                          ? undefined 
                          : feature.value;
                        
                        return (
                          <div key={index} className="flex items-start gap-2 p-3 border rounded-lg">
                            <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="font-medium text-sm">{featureName}</p>
                              {featureValue && (
                                <p className="text-xs text-muted-foreground mt-1">{featureValue}</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}
          </Accordion>

          {/* Image Modal */}
          {selectedImage && (
            <div 
              className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
              onClick={() => setSelectedImage(null)}
            >
              <div className="relative max-w-4xl max-h-[90vh]">
                <img 
                  src={selectedImage} 
                  alt="Product" 
                  className="w-full h-full object-contain"
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute top-2 right-2 bg-white"
                  onClick={() => setSelectedImage(null)}
                >
                  <XCircle className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Responsive Dialog */}
          {isMobile ? renderMobileDialog() : renderDesktopDialog()}
        </div>
      </TooltipProvider>
    </UserProvider>
  );
}