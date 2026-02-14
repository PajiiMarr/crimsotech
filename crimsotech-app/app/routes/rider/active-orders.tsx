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
import { Link } from 'react-router';
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
  ShoppingBag
} from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
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
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "~/components/ui/drawer";
import { Input } from '~/components/ui/input';

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
}

interface LoaderData {
  user: any;
}

// Status badges configuration
const STATUS_CONFIG = {
  pending: { 
    label: 'Pending', 
    color: 'bg-yellow-100 text-yellow-800',
    icon: Clock
  },
  pending_offer: { 
    label: 'Pending Offer', 
    color: 'bg-amber-100 text-amber-800',
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

// Tabs configuration
const STATUS_TABS = [
  { id: 'pending', label: 'Pending', icon: Clock },
  { id: 'to_process', label: 'To Process', icon: Truck }
];

export async function loader({ request, context}: Route.LoaderArgs): Promise<LoaderData> {
  const { registrationMiddleware } = await import("~/middleware/registration.server");
  await registrationMiddleware({ request, context, params: {}, unstable_pattern: undefined } as any);
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
  const [isDesktop, setIsDesktop] = useState(false);
  
  // State for data
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
    has_data: false
  });
  
  // State for loading and date range
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [actionType, setActionType] = useState<'pickup' | 'deliver' | null>(null);
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
    end: new Date(),
    rangeType: 'weekly' as 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'
  });

  // Minimalist tabs for rider active orders (Pending / To Process)
  const [activeTab, setActiveTab] = useState<'pending' | 'to_process'>('pending');
  const [expandedDeliveries, setExpandedDeliveries] = useState<Set<string>>(new Set());

  // Check if desktop on mount and resize
  useEffect(() => {
    const checkIfDesktop = () => {
      setIsDesktop(window.innerWidth >= 768);
    };
    
    checkIfDesktop();
    window.addEventListener('resize', checkIfDesktop);
    
    return () => window.removeEventListener('resize', checkIfDesktop);
  }, []);

  // Fetch data function
  const fetchDeliveryData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch metrics and deliveries in parallel
      const [metricsResponse, deliveriesResponse] = await Promise.all([
        AxiosInstance.get('/rider-orders-active/get_metrics/', {
            headers: {
                'X-User-Id': user.user_id
            }
        }),
        AxiosInstance.get('/rider-orders-active/get_deliveries/?page=1&page_size=50&status=all', {
            headers: {
                'X-User-Id': user.user_id
            }
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
      // Reset to empty state on error
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
        has_data: false
      });
      setDeliveries([]);
      setPendingOrders([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle action confirmation
  const confirmAction = async () => {
    if (!selectedDelivery || !actionType) return;

    // Client-side guard: prevent firing pickup if delivery is not in a valid pre-pickup state
    if (actionType === 'pickup') {
      const status = String(selectedDelivery.status || '').toLowerCase();
      const allowed = ['pending', 'pending_offer', 'accepted'];
      if (!allowed.includes(status)) {
        alert(`Cannot mark pickup — delivery status is "${selectedDelivery.status}" (expected: ${allowed.join(', ')}).`);
        return;
      }
    }

    try {
      setIsActionLoading(true);

      const endpoint = actionType === 'pickup'
        ? '/rider-orders-active/pickup_order/'
        : '/rider-orders-active/deliver_order/';

        // Debug: print the payload we'll send
      console.debug('[RiderAction] sending', { actionType, deliveryId: selectedDelivery.id, deliveryStatus: selectedDelivery.status, riderUserId: user.user_id });

      // Pause in devtools so you can inspect `selectedDelivery` and the outgoing payload
      if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
        // eslint-disable-next-line no-debugger
        debugger;
      }

      // Use FormData to ensure proper data format — include both delivery_id and order_id as a fallback
      const formData = new FormData();
      formData.append('delivery_id', selectedDelivery.id);
      if (selectedDelivery.order?.order_id) {
        formData.append('order_id', selectedDelivery.order.order_id);
      }

      const response = await AxiosInstance.post(endpoint, formData, {
        headers: {
          'X-User-Id': user.user_id,
          // FormData will set the correct content type automatically
        }
      });
      console.debug('[RiderAction] response', response.data);

      if (response.data.success) {
        // Refresh data
        await fetchDeliveryData();
        // Close dialog
        setShowActionDialog(false);
        setSelectedDelivery(null);
        setActionType(null);
        alert(`Order ${actionType === 'pickup' ? 'picked up' : 'delivered'} successfully!`);
      } else {
        // Show server-provided message when available
        alert(response.data.error || `Failed to ${actionType} order`);
      }
    } catch (error: any) {
      console.error('Error performing action:', error);
      console.error('Error response:', error.response?.data);
      alert((error.response?.data && error.response.data.error) || `Failed to ${actionType} order`);
    } finally {
      setIsActionLoading(false);
    }
  };

  // Handle pickup action
  const handlePickupClick = (delivery: Delivery) => {
    setSelectedDelivery(delivery);
    setActionType('pickup');
    setShowActionDialog(true);
  };

  // Handle delivery action
  const handleDeliverClick = (delivery: Delivery) => {
    setSelectedDelivery(delivery);
    setActionType('deliver');
    setShowActionDialog(true);
  };

  // Accept a delivery (calls backend accept_order endpoint)
  const handleAcceptDelivery = async (delivery: Delivery) => {
    try {
      setIsActionLoading(true);
      const formData = new FormData();
      formData.append('order_id', delivery.id);

      const response = await AxiosInstance.post('/rider-orders-active/accept_order/', formData, {
        headers: {
          'X-User-Id': user.user_id
        }
      });

      // DEBUG: show server response so we can confirm persisted status
      console.debug('rider/accept_order response', response.data);

      if (response.data.success) {
        // update UI to show 'accepted' status (frontend representation)
        setDeliveries(prev => prev.map(d => d.id === delivery.id ? { ...d, status: 'accepted' } : d));
        // if currently selectedDelivery is the same, update it too
        if (selectedDelivery?.id === delivery.id) {
          setSelectedDelivery(prev => prev ? { ...prev, status: 'accepted' } : prev);
        }
        alert('Order accepted');
      } else {
        console.error('Accept delivery failed:', response.data);
        alert(response.data.error || 'Failed to accept order');
      }
    } catch (err: any) {
      console.error('Error accepting delivery:', err);
      alert(err?.response?.data?.error || 'Failed to accept order');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Decline a delivery (no server endpoint available — remove locally and refresh)
  const handleDeclineDelivery = async (deliveryId: string) => {
    // optimistic UI: remove from list immediately for feedback
    setDeliveries(prev => prev.filter(d => d.id !== deliveryId));
    // attempt a refresh to sync with server
    try {
      await fetchDeliveryData();
      alert('Order declined');
    } catch (err) {
      // still succeed locally
      console.warn('Decline refresh failed, delivery removed locally', err);
      alert('Order declined (local)');
    }
  };

  // Mark an accepted delivery as failed (persisted on server -> status='declined')
  const handleMarkFailed = async (delivery: Delivery) => {
    if (!confirm('Mark this delivery as failed? This will unassign you from the delivery.')) return;
    try {
      setIsActionLoading(true);
      const formData = new FormData();
      formData.append('delivery_id', delivery.id);
      formData.append('status', 'declined');

      const res = await AxiosInstance.post('/rider-orders-active/update_delivery_status/', formData, {
        headers: { 'X-User-Id': user.user_id }
      });

      console.debug('update_delivery_status response', res.data);

      if (res.data.success) {
        // refresh list to reflect change
        await fetchDeliveryData();
        alert('Delivery marked as failed');
      } else {
        alert(res.data.error || 'Failed to mark delivery as failed');
      }
    } catch (err: any) {
      console.error('Failed to mark failed:', err);
      alert(err?.response?.data?.error || 'Failed to mark delivery as failed');
    } finally {
      setIsActionLoading(false);
    }
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

  // Prepare transformed data for the table (filtered by activeTab)
  const pendingStatuses = ['pending', 'pending_offer'];
  const toProcessStatuses = ['accepted', 'picked_up']; // "To Process" / To Pick Up includes accepted + picked_up (in-transit)

  const filteredDeliveries = useMemo(() => {
    let filtered = activeTab === 'pending' 
      ? deliveries.filter(d => pendingStatuses.includes(d.status))
      : deliveries.filter(d => toProcessStatuses.includes(d.status));
    
    // Apply search filter
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

  // Get status badge
  const getStatusBadge = (status: string) => {
    const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.default;
    const Icon = config.icon;
    
    return (
      <Badge 
        className={`text-[10px] h-5 px-1.5 py-0 flex items-center gap-1 ${config.color}`}
      >
        <Icon className="w-2.5 h-2.5" />
        {config.label}
      </Badge>
    );
  };

  // Format date
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

  // Format currency
  const formatCurrency = (amount: number) => {
    return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
  };

  // Get tab count
  const getTabCount = (tabId: string) => {
    if (tabId === 'pending') {
      return deliveries.filter(d => pendingStatuses.includes(d.status)).length;
    } else {
      return deliveries.filter(d => toProcessStatuses.includes(d.status)).length;
    }
  };

  // Handle date range change
  const handleDateRangeChange = (range: { start: Date; end: Date; rangeType: string }) => {
    setDateRange({
      start: range.start,
      end: range.end,
      rangeType: range.rangeType as 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'
    });
  };

  // Loading skeleton for metrics
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

  // Initial data fetch
  useEffect(() => {
    fetchDeliveryData();
  }, []);

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

          {/* Key Metrics - MINIMALIST */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {isLoading ? (
              <>
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
              </>
            )}
          </div>

          {/* Action Confirmation Dialog/Drawer */}
          {selectedDelivery && actionType && (
            <AlertDialog open={showActionDialog} onOpenChange={setShowActionDialog}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    {actionType === 'pickup' ? <Package className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                    {actionType === 'pickup' ? 'Pick Up Order' : 'Deliver Order'}
                  </AlertDialogTitle>
                  <AlertDialogDescription className="space-y-3">
                    <p className="text-xs">
                      {actionType === 'pickup' 
                        ? 'Are you sure you want to mark this order as picked up?' 
                        : 'Are you sure you want to mark this order as delivered?'}
                    </p>
                    <div className="bg-muted p-2 rounded space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="font-medium">Order ID:</span>
                        <span className="font-mono">#{selectedDelivery.order.order_id?.slice(-8)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Customer:</span>
                        <span>{selectedDelivery.order.customer.first_name} {selectedDelivery.order.customer.last_name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Amount:</span>
                        <span className="font-bold">{formatCurrency(selectedDelivery.order.total_amount)}</span>
                      </div>
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
                    className={`text-xs h-7 ${actionType === 'pickup' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'}`}
                  >
                    {isActionLoading ? "Processing..." : actionType === 'pickup' ? 'Yes, Pick Up' : 'Yes, Deliver'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
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

                {/* Minimalist tabs (Pending / To Process) */}
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

                {/* Deliveries List - CARD-BASED */}
                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                  {isLoading ? (
                    // Loading skeletons
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
                      
                      return (
                        <Card key={delivery.id} className="overflow-hidden border">
                          <CardContent className="p-3">
                            {/* Top Section - Header */}
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

                            {/* Middle Section - Summary */}
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

                            {/* Time Elapsed */}
                            <div className="flex items-center gap-1 mb-2">
                              <Clock className="w-2.5 h-2.5 text-gray-400" />
                              <span className="text-[10px] text-gray-500">
                                {delivery.time_elapsed}
                              </span>
                            </div>

                            {/* Expanded Section - Details */}
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

                            {/* Bottom Section - Actions */}
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
                                      className="h-6 px-2 text-[10px] text-red-600 hover:bg-red-50"
                                      onClick={async () => { if (!confirm('Decline this delivery?')) return; await handleDeclineDelivery(delivery.id); }}
                                    >
                                      <span className="text-xs">Decline</span>
                                    </Button>

                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-6 px-2 text-[10px] text-green-600 hover:bg-green-50"
                                      onClick={() => handleAcceptDelivery(delivery)}
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
                                    >
                                      <span className="text-xs">Mark Failed</span>
                                    </Button>
                                  </>
                                ) : delivery.status === 'pending_offer' ? (
                                  <Button 
                                    size="sm" 
                                    onClick={() => handlePickupClick(delivery)}
                                    className="h-6 px-2 text-[10px]"
                                  >
                                    <Package className="w-2.5 h-2.5 mr-1" />
                                    Pick Up
                                  </Button>
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
                                ) : delivery.status === 'delivered' && (
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
  )
}