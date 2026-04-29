import type { Route } from "./+types/active-orders"
import SidebarLayout from '~/components/layouts/sidebar'
import { UserProvider } from '~/components/providers/user-role-provider';
import { 
  Card, 
  CardContent
} from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { Skeleton } from '~/components/ui/skeleton';
import { Link, useNavigate } from 'react-router';
import { 
  Package,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  MapPin,
  User,
  Calendar,
  Truck,
  Phone,
  Navigation,
  CreditCard,
  MoreVertical,
  PhilippinePeso,
  ChevronDown,
  ChevronUp,
  Search,
  ShoppingBag,
  Camera,
  X,
  Image as ImageIcon,
  Upload
} from 'lucide-react';
import { useState, useEffect, useMemo, useRef } from 'react';
import AxiosInstance from '~/components/axios/Axios';
import DateRangeFilter from '~/components/ui/date-range-filter';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "~/components/ui/drawer";
import { Input } from '~/components/ui/input';
import { Textarea } from '~/components/ui/textarea';
import { Label } from '~/components/ui/label';
import { ScrollArea } from '~/components/ui/scroll-area';
import { toast } from 'sonner';
import { useIsMobile } from '~/hooks/use-mobile';

export function meta(): Route.MetaDescriptors {
  return [
    {
      title: "Active Orders | Riders",
    }
  ]
}

interface Delivery {
  id: string;
  order: {
    order_id: string;
    customer: {
      id: string;
      username: string;
      first_name: string;
      last_name: string;
      contact_number: string;
    };
    shipping_address: {
      id: string;
      recipient_name: string;
      recipient_phone: string;
      street: string;
      barangay: string;
      city: string;
      province: string;
      full_address: string;
    };
    total_amount: number;
    payment_method: string;
    delivery_method: string;
    status: string;
    created_at: string;
  };
  status: string;
  proofs_count?: number;
  picked_at: string | null;
  delivered_at: string | null;
  created_at: string;
  updated_at: string;
  time_elapsed: string;
  is_late: boolean;
}

interface PendingOrder {
  order_id: string;
  customer: string;
  address: string;
  amount: number;
  created_at: string;
}

interface Metrics {
  total_active_orders: number;
  pending_pickup: number;
  in_transit: number;
  completed_deliveries: number;
  expected_earnings: number;
  avg_delivery_time: number;
  completion_rate: number;
  on_time_deliveries: number;
  late_deliveries: number;
  today_deliveries: number;
  week_earnings: number;
  has_data: boolean;
  declined_orders: number;
}

interface Proof {
  id: string;
  delivery_id: string;
  order_id: string | null;
  proof_type: string;
  proof_type_display: string;
  file_url: string;
  file_type: string;
  uploaded_at: string;
  file_name: string;
  file_size: number;
}

interface LoaderData {
  user: any;
}

const STATUS_CONFIG = {
  pending: { 
    label: 'Pending', 
    color: 'bg-yellow-100 text-yellow-800',
    icon: Clock
  },
  accepted: {
    label: 'Accepted',
    color: 'bg-indigo-100 text-indigo-800',
    icon: CheckCircle
  },
  declined: {
    label: 'Declined',
    color: 'bg-red-100 text-red-800',
    icon: AlertCircle
  },
  picked_up: { 
    label: 'In Transit', 
    color: 'bg-blue-100 text-blue-800',
    icon: Truck
  },
  delivered: { 
    label: 'Delivered', 
    color: 'bg-green-100 text-green-800',
    icon: CheckCircle
  },
  default: { 
    label: 'Unknown', 
    color: 'bg-gray-100 text-gray-800',
    icon: AlertCircle
  }
};

const STATUS_TABS = [
  { id: 'pending', label: 'Pending', icon: Clock },
  { id: 'to_process', label: 'To Process', icon: Truck }
];

export async function loader({ request, context}: Route.LoaderArgs): Promise<LoaderData> {
  const { requireRole } = await import("~/middleware/role-require.server");
  const { fetchUserRole } = await import("~/middleware/role.server");

  let user = (context as any).user;
  if (!user) {
    user = await fetchUserRole({ request, context });
  }

  await requireRole(request, context, ["isRider"]);

  return { user };
}

export default function ActiveOrders({ loaderData}: { loaderData: LoaderData }){
  const { user } = loaderData;
  const isMobile = useIsMobile();
  
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);
  const [metrics, setMetrics] = useState<Metrics>({
    total_active_orders: 0,
    pending_pickup: 0,
    in_transit: 0,
    completed_deliveries: 0,
    expected_earnings: 0,
    avg_delivery_time: 0,
    completion_rate: 0,
    on_time_deliveries: 0,
    late_deliveries: 0,
    today_deliveries: 0,
    week_earnings: 0,
    has_data: false,
    declined_orders: 0
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [actionType, setActionType] = useState<'pickup' | 'deliver' | 'decline' | null>(null);
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [showDeclineDialog, setShowDeclineDialog] = useState(false);
  const [showLimitReachedDialog, setShowLimitReachedDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    end: new Date(),
    rangeType: 'weekly' as 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'
  });

  const [showProofModal, setShowProofModal] = useState(false);
  const [proofImages, setProofImages] = useState<string[]>([]);
  const [proofFiles, setProofFiles] = useState<File[]>([]);
  const [uploadingProofs, setUploadingProofs] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showDeclineWarning, setShowDeclineWarning] = useState(false);

  const [activeTab, setActiveTab] = useState<'pending' | 'to_process'>('pending');
  const [expandedDeliveries, setExpandedDeliveries] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (metrics.declined_orders === 2) {
      setShowDeclineWarning(true);
    }
  }, [metrics.declined_orders]);

  const fetchDeliveryData = async () => {
    try {
      setIsLoading(true);
      
      const [metricsResponse, deliveriesResponse] = await Promise.all([
        AxiosInstance.get('/rider-orders-active/get_metrics/', {
            headers: { 'X-User-Id': user.user_id }
        }),
        AxiosInstance.get('/rider-orders-active/get_deliveries/?page=1&page_size=50&status=all', {
            headers: { 'X-User-Id': user.user_id }
        })
      ]);

      if (metricsResponse.data.success) {
        setMetrics(metricsResponse.data.metrics);
      }

      if (deliveriesResponse.data.success) {
        setDeliveries(deliveriesResponse.data.deliveries);
        setPendingOrders(deliveriesResponse.data.pending_orders || []);
      }

    } catch (error) {
      console.error('Error fetching delivery data:', error);
      setMetrics({
        total_active_orders: 0,
        pending_pickup: 0,
        in_transit: 0,
        completed_deliveries: 0,
        expected_earnings: 0,
        avg_delivery_time: 0,
        completion_rate: 0,
        on_time_deliveries: 0,
        late_deliveries: 0,
        today_deliveries: 0,
        week_earnings: 0,
        has_data: false,
        declined_orders: 0
      });
      setDeliveries([]);
      setPendingOrders([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeclineOrder = async () => {
    if (!selectedDelivery) return;
    
    try {
      setIsActionLoading(true);
      
      const formData = new FormData();
      formData.append('order_id', selectedDelivery.id);

      const response = await AxiosInstance.post('/rider-orders-active/decline_order/', formData, {
        headers: { 'X-User-Id': user.user_id }
      });

      if (response.data.success) {
        const currentDeclinedCount = metrics.declined_orders;
        await fetchDeliveryData();
        
        setShowDeclineDialog(false);
        setSelectedDelivery(null);
        setActionType(null);
        
        const newDeclinedCount = currentDeclinedCount + 1;
        const remaining = 3 - newDeclinedCount;
        
        if (remaining > 0) {
          toast.success('Order declined', {
            description: `You have ${remaining} decline${remaining !== 1 ? 's' : ''} remaining.`,
          });
        } else {
          toast.warning('Decline limit reached', {
            description: 'You have used all 3 of your allowed declines.',
          });
        }
      } else {
        toast.error('Failed to decline order', {
          description: response.data.error,
        });
      }
    } catch (err: any) {
      console.error('Error declining order:', err);
      toast.error('Failed to decline order', {
        description: err?.response?.data?.error,
      });
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDeliverWithProof = async () => {
    if (!selectedDelivery) return;

    if (proofImages.length === 0) {
      toast.warning('No photos added', {
        description: 'Please take at least one photo as proof of delivery.',
      });
      return;
    }

    try {
      setUploadingProofs(true);
      setUploadProgress(0);

      for (let i = 0; i < proofFiles.length; i++) {
        const file = proofFiles[i];
        const formData = new FormData();
        formData.append('proof_type', 'delivery');
        formData.append('file', file);

        const response = await AxiosInstance.post(
          `/rider-proof/upload/${selectedDelivery.id}/`,
          formData,
          {
            headers: {
              'X-User-Id': user.user_id,
              'Content-Type': 'multipart/form-data'
            }
          }
        );

        setUploadProgress(((i + 1) / proofFiles.length) * 100);
      }

      const deliverFormData = new FormData();
      deliverFormData.append('delivery_id', selectedDelivery.id);
      if (selectedDelivery.order?.order_id) {
        deliverFormData.append('order_id', selectedDelivery.order.order_id);
      }

      const deliverResponse = await AxiosInstance.post(
        '/rider-orders-active/deliver_order/',
        deliverFormData,
        {
          headers: { 'X-User-Id': user.user_id }
        }
      );

      if (deliverResponse.data.success) {
        await fetchDeliveryData();
        setShowProofModal(false);
        setProofImages([]);
        setProofFiles([]);
        setSelectedDelivery(null);
        setActionType(null);
        toast.success('Order delivered!', {
          description: 'Proof of delivery uploaded successfully.',
        });
        navigate('/rider/orders/history');
      } else {
        toast.error('Failed to mark as delivered', {
          description: deliverResponse.data.error,
        });
      }
    } catch (error: any) {
      console.error('Error uploading proofs or marking delivery:', error);
      toast.error('Failed to complete delivery', {
        description: error.response?.data?.error,
      });
    } finally {
      setUploadingProofs(false);
      setUploadProgress(0);
    }
  };

  const handleCameraCapture = () => {
    if (proofImages.length >= 6) {
      toast.warning('Photo limit reached', {
        description: 'Maximum 6 photos allowed.',
      });
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.multiple = false;

    input.onchange = (e: Event) => {
      const target = e.target as HTMLInputElement;
      if (target.files && target.files[0]) {
        const file = target.files[0];
        const reader = new FileReader();
        
        reader.onload = (readerEvent) => {
          const result = readerEvent.target?.result as string;
          setProofImages(prev => [...prev, result]);
          setProofFiles(prev => [...prev, file]);
        };
        
        reader.readAsDataURL(file);
      }
    };

    input.click();
  };

  const handleRemoveImage = (index: number) => {
    setProofImages(prev => prev.filter((_, i) => i !== index));
    setProofFiles(prev => prev.filter((_, i) => i !== index));
  };

  const confirmAction = async () => {
    if (!selectedDelivery || !actionType) return;

    if (actionType === 'pickup') {
      const status = String(selectedDelivery.status || '').toLowerCase();
      const allowed = ['pending', 'accepted'];
      if (!allowed.includes(status)) {
        toast.error('Cannot mark pickup', {
          description: `Delivery status is "${selectedDelivery.status}" (expected: ${allowed.join(', ')}).`,
        });
        return;
      }
    }

    try {
      setIsActionLoading(true);

      const endpoint = '/rider-orders-active/pickup_order/';

      const formData = new FormData();
      formData.append('delivery_id', selectedDelivery.id);
      if (selectedDelivery.order?.order_id) {
        formData.append('order_id', selectedDelivery.order.order_id);
      }

      const response = await AxiosInstance.post(endpoint, formData, {
        headers: { 'X-User-Id': user.user_id }
      });

      if (response.data.success) {
        await fetchDeliveryData();
        setShowActionDialog(false);
        setSelectedDelivery(null);
        setActionType(null);
        toast.success('Order picked up!', {
          description: 'The order is now in transit.',
        });
      } else {
        toast.error('Failed to pick up order', {
          description: response.data.error,
        });
      }
    } catch (error: any) {
      console.error('Error performing action:', error);
      toast.error(`Failed to ${actionType} order`, {
        description: error.response?.data?.error,
      });
    } finally {
      setIsActionLoading(false);
    }
  };

  const navigate = useNavigate();

  const handlePickupClick = (delivery: Delivery) => {
    setSelectedDelivery(delivery);
    setActionType('pickup');
    setShowActionDialog(true);
  };

  const handleDeliverClick = (delivery: Delivery) => {
    setSelectedDelivery(delivery);
    setActionType('deliver');
    setShowProofModal(true);
  };

  const handleDeclineClick = (delivery: Delivery) => {
    if (metrics.declined_orders >= 3) {
      setSelectedDelivery(delivery);
      setShowLimitReachedDialog(true);
      return;
    }
    setSelectedDelivery(delivery);
    setActionType('decline');
    setShowDeclineDialog(true);
  };

  const handleAcceptDelivery = async (delivery: Delivery) => {
    try {
      setIsActionLoading(true);
      const formData = new FormData();
      formData.append('order_id', delivery.id);

      const response = await AxiosInstance.post('/rider-orders-active/accept_order/', formData, {
        headers: { 'X-User-Id': user.user_id }
      });

      if (response.data.success) {
        setDeliveries(prev => prev.map(d => d.id === delivery.id ? { ...d, status: 'accepted' } : d));
        if (selectedDelivery?.id === delivery.id) {
          setSelectedDelivery(prev => prev ? { ...prev, status: 'accepted' } : prev);
        }
        toast.success('Order accepted', {
          description: `Order #${delivery.order.order_id?.slice(-8)} is now yours.`,
        });
      } else {
        toast.error('Failed to accept order', {
          description: response.data.error,
        });
      }
    } catch (err: any) {
      console.error('Error accepting delivery:', err);
      toast.error('Failed to accept order', {
        description: err?.response?.data?.error,
      });
    } finally {
      setIsActionLoading(false);
    }
  };

  // Replaced confirm() with a sonner toast that has action buttons
  const handleMarkFailed = async (delivery: Delivery) => {
    toast('Mark delivery as failed?', {
      description: 'This will unassign you from the delivery.',
      action: {
        label: 'Yes, mark failed',
        onClick: async () => {
          try {
            setIsActionLoading(true);
            const formData = new FormData();
            formData.append('delivery_id', delivery.id);
            formData.append('status', 'declined');

            const res = await AxiosInstance.post('/rider-orders-active/update_delivery_status/', formData, {
              headers: { 'X-User-Id': user.user_id }
            });

            if (res.data.success) {
              await fetchDeliveryData();
              toast.success('Delivery marked as failed');
            } else {
              toast.error('Failed to update delivery', {
                description: res.data.error,
              });
            }
          } catch (err: any) {
            console.error('Failed to mark failed:', err);
            toast.error('Failed to update delivery', {
              description: err?.response?.data?.error,
            });
          } finally {
            setIsActionLoading(false);
          }
        },
      },
      cancel: {
        label: 'Cancel',
        onClick: () => {},
      },
    });
  };

  const toggleDeliveryExpansion = (deliveryId: string) => {
    const newExpanded = new Set(expandedDeliveries);
    if (newExpanded.has(deliveryId)) {
      newExpanded.delete(deliveryId);
    } else {
      newExpanded.add(deliveryId);
    }
    setExpandedDeliveries(newExpanded);
  };

  const pendingStatuses = ['pending'];
  const toProcessStatuses = ['accepted', 'picked_up'];

  const filteredDeliveries = useMemo(() => {
    let filtered = activeTab === 'pending' 
      ? deliveries.filter(d => pendingStatuses.includes(d.status))
      : deliveries.filter(d => toProcessStatuses.includes(d.status));
    
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(d => 
        d.order.order_id.toLowerCase().includes(searchLower) ||
        `${d.order.customer.first_name} ${d.order.customer.last_name}`.toLowerCase().includes(searchLower) ||
        d.order.shipping_address?.full_address?.toLowerCase().includes(searchLower)
      );
    }
    
    return filtered;
  }, [deliveries, activeTab, searchTerm]);

  const getStatusBadge = (status: string) => {
    const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.default;
    const Icon = config.icon;
    
    return (
      <Badge className={`text-[10px] h-5 px-1.5 py-0 flex items-center gap-1 ${config.color}`}>
        <Icon className="w-2.5 h-2.5" />
        {config.label}
      </Badge>
    );
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return '';
    }
  };

  const formatCurrency = (amount: number) => {
    return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
  };

  const getTabCount = (tabId: string) => {
    if (tabId === 'pending') {
      return deliveries.filter(d => pendingStatuses.includes(d.status)).length;
    } else {
      return deliveries.filter(d => toProcessStatuses.includes(d.status)).length;
    }
  };

  const handleDateRangeChange = (range: { start: Date; end: Date; rangeType: string }) => {
    setDateRange({
      start: range.start,
      end: range.end,
      rangeType: range.rangeType as 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'
    });
  };

  const MetricCardSkeleton = () => (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-3 w-16 mb-2" />
            <Skeleton className="h-5 w-12" />
            <Skeleton className="h-2 w-20 mt-2" />
          </div>
          <Skeleton className="w-8 h-8 rounded-full" />
        </div>
      </CardContent>
    </Card>
  );

  useEffect(() => {
    fetchDeliveryData();
  }, []);

  // ─── Shared content for Decline Warning ───────────────────────────────────
  const DeclineWarningContent = () => (
    <>
      <p>You have declined {metrics.declined_orders} out of 3 allowed orders.</p>
      <p className="font-medium text-orange-600">
        You have {3 - metrics.declined_orders} decline{3 - metrics.declined_orders !== 1 ? 's' : ''} remaining.
      </p>
      <p className="text-xs text-muted-foreground mt-2">
        Reaching the limit will prevent you from declining further orders.
      </p>
    </>
  );

  // ─── Shared content for Limit Reached ─────────────────────────────────────
  const LimitReachedContent = () => (
    <>
      <p className="text-sm">You have reached the maximum number of declined orders (3).</p>
      <div className="bg-muted p-3 rounded space-y-2 text-sm mt-2">
        <div className="flex justify-between">
          <span className="font-medium">Order ID:</span>
          <span className="font-mono">#{selectedDelivery?.order.order_id?.slice(-8)}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-medium">Customer:</span>
          <span>{selectedDelivery?.order.customer.first_name} {selectedDelivery?.order.customer.last_name}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-medium">Amount:</span>
          <span className="font-bold">{selectedDelivery ? formatCurrency(selectedDelivery.order.total_amount) : '₱0.00'}</span>
        </div>
      </div>
      <p className="text-xs text-red-600 font-medium mt-2">
        You cannot decline any more orders. Please accept this order or wait for it to expire.
      </p>
    </>
  );

  // ─── Shared content for Decline Confirmation ──────────────────────────────
  const DeclineConfirmContent = () => (
    <>
      <p className="text-sm">Are you sure you want to decline this order?</p>
      <div className="bg-muted p-3 rounded space-y-2 text-sm mt-2">
        <div className="flex justify-between">
          <span className="font-medium">Order ID:</span>
          <span className="font-mono">#{selectedDelivery?.order.order_id?.slice(-8)}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-medium">Customer:</span>
          <span>{selectedDelivery?.order.customer.first_name} {selectedDelivery?.order.customer.last_name}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-medium">Amount:</span>
          <span className="font-bold">{selectedDelivery ? formatCurrency(selectedDelivery.order.total_amount) : '₱0.00'}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-medium">Remaining declines:</span>
          <span className={`font-bold ${3 - metrics.declined_orders <= 1 ? 'text-red-600' : 'text-orange-600'}`}>
            {3 - metrics.declined_orders - 1} left
          </span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        This action cannot be undone. The order will be reassigned to another rider.
      </p>
    </>
  );

  // ─── Shared content for Pickup Confirmation ───────────────────────────────
  const PickupConfirmContent = () => (
    <>
      <p className="text-xs">Are you sure you want to mark this order as picked up?</p>
      <div className="bg-muted p-2 rounded space-y-1 text-xs mt-2">
        <div className="flex justify-between">
          <span className="font-medium">Order ID:</span>
          <span className="font-mono">#{selectedDelivery?.order.order_id?.slice(-8)}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-medium">Customer:</span>
          <span>{selectedDelivery?.order.customer.first_name} {selectedDelivery?.order.customer.last_name}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-medium">Amount:</span>
          <span className="font-bold">{selectedDelivery ? formatCurrency(selectedDelivery.order.total_amount) : '₱0.00'}</span>
        </div>
      </div>
    </>
  );

  // ─── Shared content for Proof of Delivery ─────────────────────────────────
  const ProofOfDeliveryContent = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        {proofImages.map((image, index) => (
          <div key={index} className="relative aspect-square rounded-md overflow-hidden border">
            <img 
              src={image} 
              alt={`Proof ${index + 1}`} 
              className="w-full h-full object-cover"
            />
            <button
              onClick={() => handleRemoveImage(index)}
              className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
              disabled={uploadingProofs}
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        {proofImages.length < 6 && (
          <button
            onClick={handleCameraCapture}
            disabled={uploadingProofs}
            className="aspect-square rounded-md border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-1 hover:border-gray-400 transition-colors disabled:opacity-50"
          >
            <Camera className="w-6 h-6 text-gray-400" />
            <span className="text-[10px] text-gray-500">Take Photo</span>
          </button>
        )}
      </div>

      {uploadingProofs && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span>Uploading proofs...</span>
            <span>{Math.round(uploadProgress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-green-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      <p className="text-xs text-gray-500">
        {proofImages.length}/6 photos taken. All photos are uploaded in real-time.
      </p>
    </div>
  );

  return (
    <UserProvider user={user}>
      <SidebarLayout>
        <div className="space-y-3 p-3">
          {/* Header */}
          <div className="mb-2">
            <h1 className="text-lg font-bold">Active Orders</h1>
            <p className="text-gray-500 text-xs">Manage your deliveries and track performance</p>
          </div>

          <DateRangeFilter 
            onDateRangeChange={handleDateRangeChange}
            isLoading={isLoading}
          />

          {/* Key Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-2">
            {isLoading ? (
              <>
                <MetricCardSkeleton />
                <MetricCardSkeleton />
                <MetricCardSkeleton />
                <MetricCardSkeleton />
                <MetricCardSkeleton />
              </>
            ) : (
              <>
                <Card>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">Active Orders</p>
                        <p className="text-lg font-bold mt-1">{metrics.total_active_orders}</p>
                        <div className="flex gap-1 text-[10px] text-muted-foreground mt-1">
                          <span className="flex items-center gap-0.5">
                            <Clock className="w-2 h-2" /> {metrics.pending_pickup}
                          </span>
                          <span className="flex items-center gap-0.5">
                            <Truck className="w-2 h-2" /> {metrics.in_transit}
                          </span>
                        </div>
                      </div>
                      <div className="p-1.5 bg-blue-100 rounded-full">
                        <Package className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">Expected Earnings</p>
                        <p className="text-lg font-bold mt-1">
                          ₱{metrics.expected_earnings.toLocaleString()}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          ₱{metrics.week_earnings.toLocaleString()} this week
                        </p>
                      </div>
                      <div className="p-1.5 bg-green-100 rounded-full">
                        <PhilippinePeso className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">Avg Delivery Time</p>
                        <p className="text-lg font-bold mt-1">
                          {Math.floor(metrics.avg_delivery_time / 60)}h {Math.round(metrics.avg_delivery_time % 60)}m
                        </p>
                        <div className="flex gap-1 text-[10px] text-muted-foreground mt-1">
                          <span className="flex items-center gap-0.5">
                            <CheckCircle className="w-2 h-2 text-green-500" /> {metrics.on_time_deliveries}
                          </span>
                          <span className="flex items-center gap-0.5">
                            <AlertCircle className="w-2 h-2 text-red-500" /> {metrics.late_deliveries}
                          </span>
                        </div>
                      </div>
                      <div className="p-1.5 bg-purple-100 rounded-full">
                        <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-purple-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">Completion Rate</p>
                        <p className="text-lg font-bold mt-1">
                          {metrics.completion_rate.toFixed(1)}%
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {metrics.today_deliveries} deliveries today
                        </p>
                      </div>
                      <div className="p-1.5 bg-yellow-100 rounded-full">
                        <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">Declined Orders</p>
                        <p className="text-lg font-bold mt-1">
                          {metrics.declined_orders}/3
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {metrics.today_deliveries} total deliveries
                        </p>
                      </div>
                      <div className={`p-1.5 rounded-full ${metrics.declined_orders >= 3 ? 'bg-red-100' : 'bg-orange-100'}`}>
                        <AlertCircle className={`w-3 h-3 sm:w-4 sm:h-4 ${metrics.declined_orders >= 3 ? 'text-red-600' : 'text-orange-600'}`} />
                      </div>
                    </div>
                    <div className="mt-2">
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div 
                          className={`h-1.5 rounded-full transition-all ${
                            metrics.declined_orders >= 3 ? 'bg-red-600' : 
                            metrics.declined_orders >= 2 ? 'bg-orange-500' : 'bg-yellow-500'
                          }`}
                          style={{ width: `${(metrics.declined_orders / 3) * 100}%` }}
                        />
                      </div>
                      <p className="text-[8px] text-gray-500 mt-1">
                        {metrics.declined_orders >= 3 
                          ? 'Decline limit reached - cannot decline more orders' 
                          : `${3 - metrics.declined_orders} decline${3 - metrics.declined_orders !== 1 ? 's' : ''} remaining`}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          {/* ── Approaching Decline Limit Warning ─────────────────────────────── */}
          {isMobile ? (
            <Drawer open={showDeclineWarning} onOpenChange={setShowDeclineWarning}>
              <DrawerContent>
                <DrawerHeader>
                  <DrawerTitle className="flex items-center gap-2 text-orange-600">
                    <AlertCircle className="w-5 h-5" />
                    Approaching Decline Limit
                  </DrawerTitle>
                  <DrawerDescription asChild>
                    <div className="space-y-2 text-sm text-left">
                      <DeclineWarningContent />
                    </div>
                  </DrawerDescription>
                </DrawerHeader>
                <DrawerFooter>
                  <DrawerClose asChild>
                    <Button
                      onClick={() => setShowDeclineWarning(false)}
                      className="bg-orange-600 hover:bg-orange-700 text-xs h-8 w-full"
                    >
                      Understood
                    </Button>
                  </DrawerClose>
                </DrawerFooter>
              </DrawerContent>
            </Drawer>
          ) : (
            <AlertDialog open={showDeclineWarning} onOpenChange={setShowDeclineWarning}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2 text-orange-600">
                    <AlertCircle className="w-5 h-5" />
                    Approaching Decline Limit
                  </AlertDialogTitle>
                  <AlertDialogDescription asChild>
                    <div className="space-y-2">
                      <DeclineWarningContent />
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogAction 
                    onClick={() => setShowDeclineWarning(false)} 
                    className="bg-orange-600 hover:bg-orange-700 text-xs h-8"
                  >
                    Understood
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          {/* ── Decline Limit Reached ─────────────────────────────────────────── */}
          {isMobile ? (
            <Drawer open={showLimitReachedDialog} onOpenChange={setShowLimitReachedDialog}>
              <DrawerContent>
                <DrawerHeader>
                  <DrawerTitle className="flex items-center gap-2 text-red-600">
                    <AlertCircle className="w-5 h-5" />
                    Decline Limit Reached
                  </DrawerTitle>
                  <DrawerDescription asChild>
                    <div className="text-sm text-left">
                      <LimitReachedContent />
                    </div>
                  </DrawerDescription>
                </DrawerHeader>
                <DrawerFooter>
                  <DrawerClose asChild>
                    <Button
                      onClick={() => { setShowLimitReachedDialog(false); setSelectedDelivery(null); }}
                      className="bg-red-600 hover:bg-red-700 text-xs h-8 w-full"
                    >
                      Understood
                    </Button>
                  </DrawerClose>
                </DrawerFooter>
              </DrawerContent>
            </Drawer>
          ) : (
            <AlertDialog open={showLimitReachedDialog} onOpenChange={setShowLimitReachedDialog}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                    <AlertCircle className="w-5 h-5" />
                    Decline Limit Reached
                  </AlertDialogTitle>
                  <AlertDialogDescription asChild>
                    <div>
                      <LimitReachedContent />
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogAction 
                    onClick={() => { setShowLimitReachedDialog(false); setSelectedDelivery(null); }} 
                    className="bg-red-600 hover:bg-red-700 text-xs h-8"
                  >
                    Understood
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          {/* ── Decline Confirmation ──────────────────────────────────────────── */}
          {selectedDelivery && actionType === 'decline' && (
            isMobile ? (
              <Drawer open={showDeclineDialog} onOpenChange={setShowDeclineDialog}>
                <DrawerContent>
                  <DrawerHeader>
                    <DrawerTitle className="flex items-center gap-2 text-red-600">
                      <AlertCircle className="w-5 h-5" />
                      Decline Order
                    </DrawerTitle>
                    <DrawerDescription asChild>
                      <div className="text-sm text-left">
                        <DeclineConfirmContent />
                      </div>
                    </DrawerDescription>
                  </DrawerHeader>
                  <DrawerFooter className="gap-2">
                    <Button
                      onClick={handleDeclineOrder}
                      disabled={isActionLoading}
                      className="bg-red-600 hover:bg-red-700 text-xs h-8 w-full"
                    >
                      {isActionLoading ? 'Processing...' : 'Yes, Decline Order'}
                    </Button>
                    <DrawerClose asChild>
                      <Button variant="outline" disabled={isActionLoading} className="text-xs h-8 w-full">
                        Cancel
                      </Button>
                    </DrawerClose>
                  </DrawerFooter>
                </DrawerContent>
              </Drawer>
            ) : (
              <AlertDialog open={showDeclineDialog} onOpenChange={setShowDeclineDialog}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                      <AlertCircle className="w-5 h-5" />
                      Decline Order
                    </AlertDialogTitle>
                    <AlertDialogDescription asChild>
                      <div>
                        <DeclineConfirmContent />
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={isActionLoading} className="text-xs h-8">
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeclineOrder}
                      disabled={isActionLoading}
                      className="text-xs h-8 bg-red-600 hover:bg-red-700"
                    >
                      {isActionLoading ? 'Processing...' : 'Yes, Decline Order'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )
          )}

          {/* ── Pickup Confirmation ───────────────────────────────────────────── */}
          {selectedDelivery && actionType === 'pickup' && (
            isMobile ? (
              <Drawer open={showActionDialog} onOpenChange={setShowActionDialog}>
                <DrawerContent>
                  <DrawerHeader>
                    <DrawerTitle className="flex items-center gap-2">
                      <Package className="w-4 h-4" />
                      Pick Up Order
                    </DrawerTitle>
                    <DrawerDescription asChild>
                      <div className="text-sm text-left">
                        <PickupConfirmContent />
                      </div>
                    </DrawerDescription>
                  </DrawerHeader>
                  <DrawerFooter className="gap-2">
                    <Button
                      onClick={confirmAction}
                      disabled={isActionLoading}
                      className="bg-blue-600 hover:bg-blue-700 text-xs h-8 w-full"
                    >
                      {isActionLoading ? 'Processing...' : 'Yes, Pick Up'}
                    </Button>
                    <DrawerClose asChild>
                      <Button variant="outline" disabled={isActionLoading} className="text-xs h-8 w-full">
                        Cancel
                      </Button>
                    </DrawerClose>
                  </DrawerFooter>
                </DrawerContent>
              </Drawer>
            ) : (
              <AlertDialog open={showActionDialog} onOpenChange={setShowActionDialog}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <Package className="w-4 h-4" />
                      Pick Up Order
                    </AlertDialogTitle>
                    <AlertDialogDescription asChild>
                      <div>
                        <PickupConfirmContent />
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={isActionLoading} className="text-xs h-7">
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={confirmAction}
                      disabled={isActionLoading}
                      className="text-xs h-7 bg-blue-600 hover:bg-blue-700"
                    >
                      {isActionLoading ? 'Processing...' : 'Yes, Pick Up'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )
          )}

          {/* ── Proof of Delivery — Dialog (desktop) / Drawer (mobile) ────────── */}
          {isMobile ? (
            <Drawer open={showProofModal} onOpenChange={(open) => {
              if (!open) {
                setShowProofModal(false);
                setProofImages([]);
                setProofFiles([]);
                setSelectedDelivery(null);
                setActionType(null);
              }
            }}>
              <DrawerContent>
                <DrawerHeader>
                  <DrawerTitle className="flex items-center gap-2">
                    <Camera className="w-5 h-5" />
                    Proof of Delivery
                  </DrawerTitle>
                  <DrawerDescription>
                    Take up to 6 photos as proof of delivery. Photos are taken in real-time using your camera.
                  </DrawerDescription>
                </DrawerHeader>
                <div className="px-4">
                  <ProofOfDeliveryContent />
                </div>
                <DrawerFooter className="gap-2">
                  <Button
                    onClick={handleDeliverWithProof}
                    disabled={proofImages.length === 0 || uploadingProofs}
                    className="bg-green-600 hover:bg-green-700 text-xs h-8 w-full"
                  >
                    {uploadingProofs ? 'Uploading...' : `Confirm Delivery (${proofImages.length} photo${proofImages.length !== 1 ? 's' : ''})`}
                  </Button>
                  <DrawerClose asChild>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowProofModal(false);
                        setProofImages([]);
                        setProofFiles([]);
                        setSelectedDelivery(null);
                        setActionType(null);
                      }}
                      disabled={uploadingProofs}
                      className="text-xs h-8 w-full"
                    >
                      Cancel
                    </Button>
                  </DrawerClose>
                </DrawerFooter>
              </DrawerContent>
            </Drawer>
          ) : (
            <Dialog open={showProofModal} onOpenChange={setShowProofModal}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Camera className="w-5 h-5" />
                    Proof of Delivery
                  </DialogTitle>
                  <DialogDescription>
                    Take up to 6 photos as proof of delivery. Photos are taken in real-time using your camera.
                  </DialogDescription>
                </DialogHeader>
                <ProofOfDeliveryContent />
                <DialogFooter className="sm:justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowProofModal(false);
                      setProofImages([]);
                      setProofFiles([]);
                      setSelectedDelivery(null);
                      setActionType(null);
                    }}
                    disabled={uploadingProofs}
                    className="text-xs h-8"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleDeliverWithProof}
                    disabled={proofImages.length === 0 || uploadingProofs}
                    className="text-xs h-8 bg-green-600 hover:bg-green-700"
                  >
                    {uploadingProofs ? 'Uploading...' : `Confirm Delivery (${proofImages.length} photo${proofImages.length !== 1 ? 's' : ''})`}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

          {/* Active Deliveries */}
          <Card>
            <CardContent className="p-3">
              <div className="space-y-3">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
                  <Input
                    placeholder="Search deliveries by ID, customer, or address..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 text-sm h-8"
                  />
                </div>

                {/* Tabs */}
                <div className="flex items-center space-x-1 overflow-x-auto">
                  {STATUS_TABS.map((tab) => {
                    const Icon = tab.icon;
                    const count = getTabCount(tab.id);
                    const isActive = activeTab === tab.id;
                    
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as 'pending' | 'to_process')}
                        className={`flex items-center gap-1 px-2 py-1.5 rounded text-xs whitespace-nowrap ${
                          isActive 
                            ? 'bg-blue-50 text-blue-600 border border-blue-200' 
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        <Icon className="w-3 h-3" />
                        <span>{tab.label}</span>
                        {count > 0 && (
                          <span className={`text-[10px] px-1 py-0.5 rounded ${
                            isActive ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Deliveries List */}
                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                  {isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <Card key={i} className="overflow-hidden border">
                        <CardContent className="p-3">
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-3 w-1/2" />
                            <Skeleton className="h-3 w-2/3" />
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : filteredDeliveries.length === 0 ? (
                    <div className="text-center py-4">
                      <ShoppingBag className="mx-auto h-6 w-6 text-gray-300 mb-2" />
                      <p className="text-gray-500 text-xs">
                        {activeTab === 'pending' ? 'No pending deliveries' : 'No orders to process'}
                      </p>
                    </div>
                  ) : (
                    filteredDeliveries.map((delivery) => {
                      const isExpanded = expandedDeliveries.has(delivery.id);
                      const customer = delivery.order.customer;
                      const address = delivery.order.shipping_address;
                      const isDeclineDisabled = metrics.declined_orders >= 3;
                      
                      return (
                        <Card key={delivery.id} className="overflow-hidden border">
                          <CardContent className="p-3">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <Package className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                                  <span className="text-xs font-medium truncate">
                                    Order #{delivery.order.order_id?.slice(-8)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-[10px] text-gray-500">
                                  <span className="truncate">{customer.first_name} {customer.last_name}</span>
                                  <span>•</span>
                                  <span>{formatDate(delivery.created_at)}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                {getStatusBadge(delivery.status)}
                                {delivery.is_late && (
                                  <Badge variant="destructive" className="text-[8px] h-4 px-1">
                                    Late
                                  </Badge>
                                )}
                                <button 
                                  onClick={() => toggleDeliveryExpansion(delivery.id)}
                                  className="p-1 hover:bg-gray-100 rounded"
                                >
                                  {isExpanded ? (
                                    <ChevronUp className="w-3.5 h-3.5 text-gray-400" />
                                  ) : (
                                    <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                                  )}
                                </button>
                              </div>
                            </div>

                            <div className="mb-2">
                              <div className="flex items-center gap-2 text-[10px] text-gray-600 mb-1">
                                <MapPin className="w-2.5 h-2.5" />
                                <span className="truncate">{address?.full_address || 'No address'}</span>
                              </div>
                              <div className="flex items-center gap-2 text-[10px] text-gray-600 mb-1">
                                <Phone className="w-2.5 h-2.5" />
                                <span>{customer.contact_number || 'No contact'}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <div className="text-[10px] text-gray-500 flex items-center gap-1">
                                  <CreditCard className="w-2.5 h-2.5" />
                                  {delivery.order.payment_method || 'N/A'}
                                </div>
                                <div className="font-medium text-xs">
                                  {formatCurrency(delivery.order.total_amount)}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 mb-2">
                              <Clock className="w-2.5 h-2.5 text-gray-400" />
                              <span className="text-[10px] text-gray-500">
                                {delivery.time_elapsed}
                              </span>
                            </div>

                            {isExpanded && (
                              <div className="mt-3 pt-3 border-t space-y-2">
                                <div className="text-[10px]">
                                  <div className="font-medium text-gray-700 mb-1">Recipient Information</div>
                                  <div className="text-gray-600 space-y-0.5">
                                    <div>Name: {address?.recipient_name || 'N/A'}</div>
                                    <div>Phone: {address?.recipient_phone || 'N/A'}</div>
                                  </div>
                                </div>
                                
                                <div className="text-[10px]">
                                  <div className="font-medium text-gray-700 mb-1">Delivery Details</div>
                                  <div className="text-gray-600 space-y-0.5">
                                    <div>Method: {delivery.order.delivery_method || 'N/A'}</div>
                                    {delivery.picked_at && (
                                      <div>Picked Up: {formatDate(delivery.picked_at)}</div>
                                    )}
                                    {delivery.delivered_at && (
                                      <div>Delivered: {formatDate(delivery.delivered_at)}</div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}

                            <div className="flex items-center justify-between pt-2 border-t mt-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleDeliveryExpansion(delivery.id)}
                                className="h-6 px-2 text-[10px]"
                              >
                                {isExpanded ? 'Show Less' : 'View Details'}
                              </Button>
                              
                              <div className="flex gap-1">
                                {delivery.status === 'pending' ? (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className={`h-6 px-2 text-[10px] ${
                                        isDeclineDisabled 
                                          ? 'text-gray-400 cursor-not-allowed hover:bg-transparent' 
                                          : 'text-red-600 hover:bg-red-50'
                                      }`}
                                      onClick={() => handleDeclineClick(delivery)}
                                      disabled={isActionLoading}
                                      title={isDeclineDisabled ? 'Decline limit reached (3/3)' : 'Decline this order'}
                                    >
                                      <span className="text-xs">Decline</span>
                                      {isDeclineDisabled && (
                                        <span className="ml-1 text-[8px]">(Limit reached)</span>
                                      )}
                                    </Button>

                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-6 px-2 text-[10px] text-green-600 hover:bg-green-50"
                                      onClick={() => handleAcceptDelivery(delivery)}
                                      disabled={isActionLoading}
                                    >
                                      <CheckCircle className="w-2.5 h-2.5 mr-1" />
                                      Accept
                                    </Button>
                                  </>
                                ) : delivery.status === 'accepted' ? (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handlePickupClick(delivery)}
                                      className="h-6 px-2 text-[10px]"
                                      aria-label="Mark picked up"
                                    >
                                      <Package className="w-2.5 h-2.5 mr-1" />
                                      Pick Up
                                    </Button>

                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-6 px-2 text-[10px] text-red-600 hover:bg-red-50"
                                      onClick={() => handleMarkFailed(delivery)}
                                      disabled={isActionLoading}
                                    >
                                      <span className="text-xs">Mark Failed</span>
                                    </Button>
                                  </>
                                ) : delivery.status === 'picked_up' ? (
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => handleDeliverClick(delivery)}
                                    className="h-6 px-2 text-[10px]"
                                  >
                                    <CheckCircle className="w-2.5 h-2.5 mr-1" />
                                    Deliver
                                  </Button>
                                ) : (delivery.status === 'delivered' || delivery.status === 'completed') && (
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    className="h-6 px-2 text-[10px]"
                                    asChild
                                  >
                                    <Link to={`/rider/delivery/${delivery.id}/add-delivery-media`}>
                                      {(delivery.proofs_count || 0) > 0 ? 'View Proofs' : 'Add Proof'}
                                    </Link>
                                  </Button>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </SidebarLayout>
    </UserProvider>
  );
}