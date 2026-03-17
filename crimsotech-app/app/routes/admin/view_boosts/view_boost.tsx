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
  MapPin,
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
  DollarSign,
  Zap,
  FileText,
  ExternalLink,
  RefreshCw,
  PauseCircle,
  PlayCircle,
  ArrowLeft,
  PhilippinePeso,
  Mail,
  Phone,
  Shield,
  Layers,
  Award,
  CreditCard,
  Hash,
  Building2
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
        className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        icon: PlayCircle,
        iconClassName: 'text-emerald-600'
      };
    case 'Pending':
      return {
        variant: 'secondary' as const,
        className: 'bg-amber-50 text-amber-700 border-amber-200',
        icon: Clock,
        iconClassName: 'text-amber-600'
      };
    case 'Expired':
      return {
        variant: 'outline' as const,
        className: 'bg-slate-50 text-slate-700 border-slate-200',
        icon: XCircle,
        iconClassName: 'text-slate-600'
      };
    case 'Cancelled':
      return {
        variant: 'destructive' as const,
        className: 'bg-rose-50 text-rose-700 border-rose-200',
        icon: XCircle,
        iconClassName: 'text-rose-600'
      };
    case 'Suspended':
      return {
        variant: 'destructive' as const,
        className: 'bg-orange-50 text-orange-700 border-orange-200',
        icon: Ban,
        iconClassName: 'text-orange-600'
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
        className: 'bg-slate-50 text-slate-700 border-slate-200',
        icon: AlertCircle,
        iconClassName: 'text-slate-600'
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
      className={`flex items-center gap-1.5 px-3 py-1.5 font-medium ${config.className}`}
    >
      <Icon className={`w-3.5 h-3.5 ${config.iconClassName}`} />
      {normalizeBoostStatus(status)}
    </Badge>
  );
}

// Info Row Component for consistent styling
function InfoRow({ label, value, icon: Icon }: { label: string; value: string | number; icon?: any }) {
  return (
    <div className="flex items-start gap-3 py-2 border-b border-slate-100 last:border-0">
      {Icon && <Icon className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</p>
        <p className="text-sm font-semibold text-slate-900 break-words mt-0.5">{value}</p>
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({ icon: Icon, label, value, tooltip }: { icon: any; label: string; value: string | number; tooltip?: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100 hover:border-slate-200 transition-colors cursor-help">
          <div className="p-2 bg-white rounded-lg">
            <Icon className="w-4 h-4 text-slate-700" />
          </div>
          <div>
            <p className="text-xs text-slate-500">{label}</p>
            <p className="font-semibold text-slate-900">{value}</p>
          </div>
        </div>
      </TooltipTrigger>
      {tooltip && <TooltipContent><p>{tooltip}</p></TooltipContent>}
    </Tooltip>
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
    month: 'short',
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
      
      const response = await AxiosInstance.get(`/admin-boosting/${boostId}/details/`);
      
      if (response.data.success) {
        const data = response.data.boost || response.data;
        
        const transformedBoost: BoostDetails = {
          id: data.id || data.boost_id || boostId,
          boost_id: data.boost_id || data.id,
          status: data.status || 'pending',
          payment_method: data.payment_method,
          payment_verified: data.payment_verified || false,
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

  const refreshData = async () => {
    await fetchBoostDetails();
  };

  const getAvailableActions = () => {
    if (!boost) return [];
    
    const normalizedStatus = normalizeBoostStatus(boost.status);
    const actions = [];
    
    if (normalizedStatus === 'Pending') {
      actions.push(
        { id: "approve", label: "Approve Boost", icon: CheckCircle, variant: "default" as const },
        { id: "reject", label: "Reject Boost", icon: XCircle, variant: "destructive" as const }
      );
    }
    
    if (normalizedStatus === 'Active') {
      actions.push(
        { id: "suspend", label: "Suspend Boost", icon: Ban, variant: "destructive" as const },
        { id: "cancel", label: "Cancel Boost", icon: XCircle, variant: "destructive" as const }
      );
    }
    
    if (normalizedStatus === 'Suspended') {
      actions.push(
        { id: "resume", label: "Resume Boost", icon: PlayCircle, variant: "default" as const },
        { id: "cancel", label: "Cancel Boost", icon: XCircle, variant: "destructive" as const }
      );
    }
    
    if (normalizedStatus === 'Expired') {
      actions.push({ id: "renew", label: "Renew Boost", icon: RefreshCw, variant: "default" as const });
    }
    
    if (normalizedStatus === 'Cancelled') {
      actions.push({ id: "restore", label: "Restore Boost", icon: RefreshCw, variant: "default" as const });
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
        user_id: user?.user_id || user?.id
      };
      
      if (reason.trim()) requestData.reason = reason;
      if (activeAction === 'suspend') requestData.suspension_days = suspensionDays;
      
      const response = await AxiosInstance.put(
        '/admin-boosting/update_boost_status/',
        requestData,
        { headers: { "X-User-Id": user?.user_id || user?.id || '' } }
      );
      
      toast({
        title: "Success",
        description: response.data.message || "Boost status updated successfully",
        variant: "success",
      });
      
      await refreshData();
      
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to complete action",
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
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{currentAction.title}</h3>
          <p className="text-sm text-slate-600 mt-1">{currentAction.description}</p>
        </div>
        
        <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
          <p className="text-sm font-medium text-slate-900">Boost #{boost.boost_id || boost.id.slice(0, 8)}</p>
          <p className="text-xs text-slate-600 mt-1">Status: {normalizeBoostStatus(boost.status)}</p>
          {boost.product && <p className="text-xs text-slate-600 mt-1">Product: {boost.product.name}</p>}
        </div>
        
        {(activeAction === 'reject' || activeAction === 'suspend' || activeAction === 'cancel') && (
          <div className="space-y-2">
            <Label htmlFor="reason" className="text-sm font-medium text-slate-700">
              Reason <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={`Reason for ${activeAction}ing this boost...`}
              className="border-slate-200 focus:border-slate-400 focus:ring-slate-400"
              required
            />
            <p className="text-xs text-slate-500">This reason will be recorded and may be shared with the seller.</p>
          </div>
        )}
        
        {activeAction === 'suspend' && (
          <div className="space-y-2">
            <Label htmlFor="suspension-days" className="text-sm font-medium text-slate-700">
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
                className="h-10 w-24 border-slate-200 focus:border-slate-400"
              />
              <span className="text-sm text-slate-600">days</span>
            </div>
            <p className="text-xs text-slate-500">The boost will be automatically resumed after this period.</p>
          </div>
        )}
        
        {currentAction.variant === "destructive" && (
          <div className="rounded-lg border border-rose-200 bg-rose-50/50 p-3">
            <p className="text-sm font-medium text-rose-700 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              Warning: This action may have consequences
            </p>
          </div>
        )}
      </div>
    );
  };

  const renderDesktopDialog = () => {
    if (!currentAction || !boost) return null;

    return (
      <AlertDialog open={showDialog} onOpenChange={!processing ? setShowDialog : undefined}>
        <AlertDialogContent className="sm:max-w-[500px]">
          {renderDialogContent()}
          <AlertDialogFooter className="mt-6 gap-2">
            <AlertDialogCancel onClick={handleCancel} disabled={processing}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirm}
              className={currentAction.variant === "destructive" ? "bg-rose-600 hover:bg-rose-700" : ""}
              disabled={processing || ((activeAction === 'reject' || activeAction === 'suspend' || activeAction === 'cancel') && !reason.trim())}
            >
              {processing ? (
                <><div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />Processing...</>
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
          <div className="px-4 pb-4">{renderDialogContent()}</div>
          <DrawerFooter className="pt-2 flex-col gap-2">
            <Button 
              onClick={handleConfirm}
              className={currentAction.variant === "destructive" ? "bg-rose-600 hover:bg-rose-700" : ""}
              disabled={processing || ((activeAction === 'reject' || activeAction === 'suspend' || activeAction === 'cancel') && !reason.trim())}
            >
              {processing ? "Processing..." : currentAction.confirmText}
            </Button>
            <DrawerClose asChild>
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
        <div className="min-h-screen bg-slate-50">
          <div className="container mx-auto p-4 sm:p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-20 h-10 bg-slate-200 animate-pulse rounded" />
              <div className="h-8 w-48 bg-slate-200 animate-pulse rounded" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-6">
                <div className="h-96 bg-slate-200 animate-pulse rounded-xl" />
              </div>
              <div className="space-y-6">
                <div className="h-96 bg-slate-200 animate-pulse rounded-xl" />
              </div>
            </div>
          </div>
        </div>
      </UserProvider>
    );
  }

  if (error || !boost) {
    return (
      <UserProvider user={user}>
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="text-center max-w-md p-8">
            <div className="rounded-full bg-rose-100 p-4 mb-4 inline-block">
              <AlertCircle className="h-12 w-12 text-rose-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Boost Not Found</h2>
            <p className="text-slate-600 mb-6">{error || 'The boost you\'re looking for doesn\'t exist.'}</p>
            <Button asChild className="bg-slate-900 hover:bg-slate-800">
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
        <div className="min-h-screen bg-slate-50">
          <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" asChild className="text-slate-600 hover:text-slate-900">
                  <Link to="/admin/boosting">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Link>
                </Button>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Boost Details</h1>
              </div>
              
              {availableActions.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="border-slate-200 hover:bg-slate-100">
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
                              isDestructive ? "text-rose-600 focus:text-rose-600" : "text-slate-700"
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
            <div className={`${statusConfig.className} rounded-xl border-2 p-6 shadow-sm`}>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-white/80">
                    <StatusIcon className={`h-6 w-6 ${statusConfig.iconClassName}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="text-xl font-semibold text-slate-900">
                        Boost #{boost.boost_id || boost.id.slice(0, 8)}
                      </h2>
                      <BoostStatusBadge status={boost.status} />
                    </div>
                    <p className="text-sm text-slate-600">Created on {formatDate(boost.created_at)}</p>
                  </div>
                </div>
                
                <div className="text-left sm:text-right">
                  <p className="text-sm font-medium text-slate-600">Amount</p>
                  <p className="text-3xl font-bold text-slate-900">{formatCurrency(boost.amount || boost.plan?.price)}</p>
                  {boost.payment_verified && (
                    <Badge variant="default" className="mt-2 bg-emerald-600 hover:bg-emerald-700">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Payment Verified
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Main Content Grid - 2 columns with balanced heights */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - Takes full height with grid layout */}
              <div className="space-y-6 lg:grid lg:grid-rows-[auto_auto_auto_1fr] lg:gap-6 lg:space-y-0 lg:h-full">
                {/* Product Details Card */}
                {boost.product && (
                  <Card className="border-slate-200 shadow-sm overflow-hidden">
                    <CardHeader className="bg-slate-50 border-b border-slate-200 pb-3">
                      <CardTitle className="flex items-center gap-2 text-lg text-slate-900">
                        <Package className="h-5 w-5 text-slate-600" />
                        Product Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="flex flex-col sm:flex-row">
                        <div 
                          className="sm:w-40 sm:h-40 w-full h-48 bg-slate-100 flex items-center justify-center cursor-pointer border-r border-slate-200"
                          onClick={() => setSelectedImage(boost.product?.image || null)}
                        >
                          {boost.product.image ? (
                            <img src={boost.product.image} alt={boost.product.name} className="w-full h-full object-cover" />
                          ) : (
                            <ImageIcon className="h-12 w-12 text-slate-400" />
                          )}
                        </div>
                        
                        <div className="flex-1 p-4">
                          <div className="mb-3">
                            <Link 
                              to={`/admin/products/${boost.product.id}`}
                              className="text-lg font-semibold text-slate-900 hover:text-slate-700 flex items-center gap-1"
                            >
                              {boost.product.name}
                              <ExternalLink className="h-3 w-3 text-slate-500" />
                            </Link>
                            <p className="text-sm text-slate-600 mt-1 line-clamp-2">{boost.product.description}</p>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3">
                            {boost.product.price_range && (
                              <div className="bg-slate-50 p-2 rounded">
                                <p className="text-xs text-slate-500">Price Range</p>
                                <p className="font-medium text-sm text-slate-900">
                                  {formatCurrency(boost.product.price_range.min)} - {formatCurrency(boost.product.price_range.max)}
                                </p>
                              </div>
                            )}
                            <div className="bg-slate-50 p-2 rounded">
                              <p className="text-xs text-slate-500">Stock</p>
                              <p className="font-medium text-sm text-slate-900">{boost.product.total_stock}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Shop Details Card */}
                {boost.shop && (
                  <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="bg-slate-50 border-b border-slate-200 pb-3">
                      <CardTitle className="flex items-center gap-2 text-lg text-slate-900">
                        <Store className="h-5 w-5 text-slate-600" />
                        Shop Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3 mb-4">
                        {boost.shop.shop_picture ? (
                          <img src={boost.shop.shop_picture} alt={boost.shop.name} className="w-12 h-12 rounded-lg object-cover" />
                        ) : (
                          <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
                            <Store className="w-6 h-6 text-slate-500" />
                          </div>
                        )}
                        <div className="flex-1">
                          <Link 
                            to={`/admin/shops/${boost.shop.id}`}
                            className="font-semibold text-slate-900 hover:text-slate-700 flex items-center gap-1"
                          >
                            {boost.shop.name}
                            <ExternalLink className="h-3 w-3 text-slate-500" />
                          </Link>
                          <Badge variant={boost.shop.verified ? "default" : "secondary"} className="mt-1">
                            {boost.shop.verified ? 'Verified' : 'Unverified'}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        {boost.shop.contact_number && (
                          <InfoRow label="Contact" value={boost.shop.contact_number} icon={Phone} />
                        )}
                        <InfoRow 
                          label="Location" 
                          value={[boost.shop.street, boost.shop.barangay, boost.shop.city, boost.shop.province]
                            .filter(Boolean).join(', ')} 
                          icon={MapPin} 
                        />
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Customer Details Card */}
                {boost.customer && (
                  <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="bg-slate-50 border-b border-slate-200 pb-3">
                      <CardTitle className="flex items-center gap-2 text-lg text-slate-900">
                        <User className="h-5 w-5 text-slate-600" />
                        Customer Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                      <div className="mb-3">
                        <p className="font-semibold text-slate-900">{boost.customer.name || boost.customer.username}</p>
                        <p className="text-xs text-slate-500 mt-1">ID: {boost.customer.id.slice(0, 8)}</p>
                      </div>
                      
                      <div className="space-y-2">
                        {boost.customer.email && (
                          <InfoRow label="Email" value={boost.customer.email} icon={Mail} />
                        )}
                        {boost.customer.contact_number && (
                          <InfoRow label="Phone" value={boost.customer.contact_number} icon={Phone} />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Action History Card - Takes remaining space */}
                {boost.actions && boost.actions.length > 0 ? (
                  <Card className="border-slate-200 shadow-sm h-full">
                    <CardHeader className="bg-slate-50 border-b border-slate-200 pb-3">
                      <CardTitle className="flex items-center gap-2 text-lg text-slate-900">
                        <Clock className="h-5 w-5 text-slate-600" />
                        Action History
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                      <div className="space-y-4">
                        {boost.actions.map((action) => (
                          <div key={action.id} className="flex items-start gap-3 pb-4 border-b border-slate-100 last:border-0 last:pb-0">
                            <div className="p-2 rounded-full bg-slate-100">
                              <FileText className="h-4 w-4 text-slate-600" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between flex-wrap gap-2">
                                <p className="font-medium text-slate-900 capitalize">{action.action_type.replace('_', ' ')}</p>
                                <p className="text-xs text-slate-500">{formatDate(action.performed_at)}</p>
                              </div>
                              {action.performed_by && (
                                <p className="text-xs text-slate-500 mt-1">By: {action.performed_by}</p>
                              )}
                              {action.reason && (
                                <p className="text-sm mt-2 bg-slate-50 p-2 rounded text-slate-700">Reason: {action.reason}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  /* Placeholder card to fill space when no actions */
                  <Card className="border-slate-200 shadow-sm h-full bg-slate-50/50">
                    <CardHeader className="bg-slate-50 border-b border-slate-200 pb-3">
                      <CardTitle className="flex items-center gap-2 text-lg text-slate-900">
                        <Clock className="h-5 w-5 text-slate-600" />
                        Action History
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 flex items-center justify-center h-32">
                      <p className="text-sm text-slate-500">No action history available</p>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                {/* Boost Plan Card */}
                {boost.plan && (
                  <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="bg-slate-50 border-b border-slate-200 pb-3">
                      <CardTitle className="flex items-center gap-2 text-lg text-slate-900">
                        <Zap className="h-5 w-5 text-slate-600" />
                        Boost Plan
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                      <div className="mb-4">
                        <p className="font-semibold text-lg text-slate-900">{boost.plan.name}</p>
                        {boost.plan.description && (
                          <p className="text-sm text-slate-600 mt-1">{boost.plan.description}</p>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="bg-slate-50 p-3 rounded-lg">
                          <p className="text-xs text-slate-500">Price</p>
                          <p className="font-bold text-lg text-slate-900">{formatCurrency(boost.plan.price)}</p>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-lg">
                          <p className="text-xs text-slate-500">Duration</p>
                          <p className="font-bold text-lg text-slate-900">{boost.plan.duration} {boost.plan.time_unit}</p>
                        </div>
                      </div>
                      
                      {boost.plan.features && boost.plan.features.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-slate-900 mb-3 flex items-center gap-2">
                            <Award className="h-4 w-4 text-slate-600" />
                            Features
                          </p>
                          <div className="space-y-2">
                            {boost.plan.features.map((feature, index) => {
                              const featureName = typeof feature === 'string' ? feature : feature.feature_name || 'Feature';
                              return (
                                <div key={index} className="flex items-start gap-2 p-2 bg-slate-50 rounded">
                                  <CheckCircle className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                                  <span className="text-sm text-slate-700">{featureName}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Timeline Card */}
                <Card className="border-slate-200 shadow-sm">
                  <CardHeader className="bg-slate-50 border-b border-slate-200 pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg text-slate-900">
                      <Calendar className="h-5 w-5 text-slate-600" />
                      Timeline
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <InfoRow label="Created" value={formatDate(boost.created_at)} />
                      {boost.start_date && <InfoRow label="Started" value={formatDate(boost.start_date)} />}
                      {boost.end_date && <InfoRow label="Ends" value={formatDate(boost.end_date)} />}
                      
                      {boost.days_remaining !== undefined && boost.status === 'active' && (
                        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-blue-600" />
                            <span className="text-sm font-medium text-blue-700">{boost.days_remaining} days remaining</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Payment Information Card */}
                <Card className="border-slate-200 shadow-sm">
                  <CardHeader className="bg-slate-50 border-b border-slate-200 pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg text-slate-900">
                      <PhilippinePeso className="h-5 w-5 text-slate-600" />
                      Payment Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="space-y-3 mb-4">
                      <div className="flex justify-between items-center py-2 border-b border-slate-100">
                        <span className="text-sm text-slate-600">Amount</span>
                        <span className="font-bold text-lg text-slate-900">{formatCurrency(boost.amount || boost.plan?.price)}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-slate-100">
                        <span className="text-sm text-slate-600">Method</span>
                        <Badge variant="outline" className="font-normal border-slate-200 bg-slate-50">
                          {boost.payment_method || 'N/A'}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-sm text-slate-600">Verified</span>
                        <Badge variant={boost.payment_verified ? "default" : "secondary"} 
                               className={boost.payment_verified ? "bg-emerald-600" : ""}>
                          {boost.payment_verified ? 'Yes' : 'No'}
                        </Badge>
                      </div>
                    </div>
                    
                    {/* Verification Details */}
                    {boost.verification && boost.verification.verified && (
                      <div className="pt-3 border-t border-slate-200">
                        <p className="text-xs text-slate-500">Verified by</p>
                        <p className="font-medium text-slate-900">{boost.verification.verified_by_name}</p>
                        <p className="text-xs text-slate-500 mt-1">{formatDate(boost.verification.verified_at)}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <StatCard 
                    icon={Box} 
                    label="Product Stock" 
                    value={boost.product?.total_stock || 0}
                    tooltip="Total stock of the boosted product"
                  />
                  <StatCard 
                    icon={Hash} 
                    label="Boost ID" 
                    value={boost.id.slice(0, 8)}
                    tooltip="Boost identifier"
                  />
                </div>
              </div>
            </div>

            {/* Bottom Accordion Sections */}
            <Accordion type="single" collapsible className="w-full space-y-2">
              <AccordionItem value="additional-details" className="border-slate-200 bg-white rounded-lg px-6">
                <AccordionTrigger className="text-base font-semibold text-slate-900 hover:no-underline py-4">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-slate-600" />
                    Additional Details
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="pb-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-slate-50 p-3 rounded-lg">
                      <p className="text-xs text-slate-500 mb-1">Boost ID (Full)</p>
                      <p className="font-mono text-xs text-slate-900 break-all">{boost.id}</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-lg">
                      <p className="text-xs text-slate-500 mb-1">Payment Method</p>
                      <p className="font-medium text-sm text-slate-900">{boost.payment_method || 'N/A'}</p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {boost.plan?.features && boost.plan.features.length > 0 && (
                <AccordionItem value="plan-features" className="border-slate-200 bg-white rounded-lg px-6">
                  <AccordionTrigger className="text-base font-semibold text-slate-900 hover:no-underline py-4">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-slate-600" />
                      Boost Plan Features ({boost.plan.features.length})
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="pb-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {boost.plan.features.map((feature, index) => {
                        const featureName = typeof feature === 'string' ? feature : feature.feature_name || 'Feature';
                        const featureValue = typeof feature === 'string' ? undefined : feature.value;
                        
                        return (
                          <div key={index} className="flex items-start gap-2 p-3 bg-slate-50 rounded-lg border border-slate-100">
                            <Shield className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="font-medium text-sm text-slate-900">{featureName}</p>
                              {featureValue && <p className="text-xs text-slate-600 mt-1">{featureValue}</p>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}
            </Accordion>

            {selectedImage && (
              <div 
                className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
                onClick={() => setSelectedImage(null)}
              >
                <div className="relative max-w-5xl max-h-[90vh]">
                  <img src={selectedImage} alt="Product" className="w-full h-full object-contain rounded-lg" />
                  <Button
                    variant="outline"
                    size="icon"
                    className="absolute top-4 right-4 bg-white hover:bg-slate-100 border-slate-200"
                    onClick={() => setSelectedImage(null)}
                  >
                    <XCircle className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            )}

            {isMobile ? renderMobileDialog() : renderDesktopDialog()}
          </div>
        </div>
      </TooltipProvider>
    </UserProvider>
  );
}