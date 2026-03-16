import type { Route } from './+types/seller-order-list';
import SidebarLayout from '~/components/layouts/seller-sidebar'
import { UserProvider } from '~/components/providers/user-role-provider';
import { 
  Card, 
  CardContent
} from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Calendar } from '~/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover';
import { format } from 'date-fns';
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { 
  ShoppingCart,
  Clock,
  User,
  Package,
  PhilippinePeso,
  Printer,
  CheckCircle,
  XCircle,
  Search,
  Eye,
  Truck,
  Package2,
  List,
  Ship,
  Loader2,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Phone,
  MoreHorizontal,
  Store,
  Ban,
  AlertCircle,
  MessageCircle,
  Handshake,
  Clock as ClockIcon,
  CheckCheck,
  UserRoundCheck,
  CalendarDays,
  MapPin,
} from 'lucide-react';
import AxiosInstance from '~/components/axios/Axios';
import { useIsMobile } from '~/hooks/use-mobile';
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '~/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { toast } from 'sonner';

export function meta(): Route.MetaDescriptors {
  return [{ title: "Seller Orders" }];
}

interface MediaItem {
  id: string;
  url: string;
  file_type: string;
}

interface DeliveryInfo {
  delivery_id?: string;
  rider_name?: string;
  status?: string;
  tracking_number?: string;
  estimated_delivery?: string;
  submitted_at?: string;
  is_pending_offer?: boolean;
}

interface OrderItemProduct {
  id: string;
  name: string;
  price: number;
  variant: string;
  shop: { id: string; name: string; };
  media?: MediaItem[];
  primary_image?: MediaItem | null;
  variant_image?: string | null;
}

interface OrderItemCartItem {
  id: string;
  product: OrderItemProduct;
  quantity: number;
  variant_id?: string | null;
}

interface OrderItem {
  id: string;
  cart_item: OrderItemCartItem;
  quantity: number;
  total_amount: number;
  status: string;
  created_at: string;
  is_shipped?: boolean;
  shipping_method?: string | null;
  tracking_number?: string | null;
  estimated_delivery?: string | null;
  is_processed?: boolean;
  shipping_status?: string;
  waybill_url?: string;
}

interface Order {
  order_id: string;
  user: {
    id: string;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    phone?: string;
  };
  status: string;
  total_amount: number;
  payment_method: string | null;
  delivery_method?: string | null;
  shipping_method?: string | null;
  delivery_address: string | null;
  created_at: string;
  updated_at: string;
  items: OrderItem[];
  is_pickup?: boolean;
  delivery_info?: DeliveryInfo;
}

interface ApiResponse {
  success: boolean;
  message: string;
  data: Order[];
  data_source: string;
}

interface AvailableActionsResponse {
  success: boolean;
  data: {
    order_id: string;
    current_status: string;
    is_pickup: boolean;
    has_pending_offer: boolean;
    available_actions: string[];
  };
}

const isCashOnPickup = (order: Order): boolean => {
  const method = (order.payment_method || '').toLowerCase();
  return method.includes('cash') && (
    method.includes('pickup') ||
    (order.delivery_method || '').toLowerCase().includes('pickup') ||
    order.is_pickup === true
  );
};

export async function loader({ request, context }: Route.LoaderArgs) {
  const { requireRole } = await import("~/middleware/role-require.server");
  const { fetchUserRole } = await import("~/middleware/role.server");
  let user = (context as any).user;
  if (!user) user = await fetchUserRole({ request, context });
  await requireRole(request, context, ["isCustomer"]);
  const { getSession } = await import('~/sessions.server');
  const session = await getSession(request.headers.get("Cookie"));
  const userId = session.get("userId");
  const shopId = session.get("shopId");
  let orders: Order[] = [];
  if (userId && shopId) {
    try {
      const axiosInstance = await import('~/components/axios/Axios').then(m => m.default);
      const response = await axiosInstance.get<ApiResponse>('/seller-order-list/order_list/', {
        params: { shop_id: shopId }
      });
      if (response.data.success) orders = response.data.data || [];
    } catch (error) {
      console.error('Error fetching orders in loader:', error);
    }
  }
  return { userId, shopId, orders };
}

const STATUS_CONFIG = {
  pending_shipment: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800', borderColor: 'border-l-4 border-l-yellow-500', icon: Clock },
  to_ship: { label: 'Processing', color: 'bg-amber-100 text-amber-800', borderColor: 'border-l-4 border-l-amber-500', icon: Loader2 },
  processing: { label: 'Processing', color: 'bg-amber-100 text-amber-800', borderColor: 'border-l-4 border-l-amber-500', icon: Loader2 },
  ready_for_pickup: { label: 'Ready for Pickup', color: 'bg-blue-100 text-blue-800', borderColor: 'border-l-4 border-l-blue-500', icon: Store },
  shipped: { label: 'Shipped', color: 'bg-blue-100 text-blue-800', borderColor: 'border-l-4 border-l-blue-500', icon: Ship },
  in_transit: { label: 'In Transit', color: 'bg-purple-100 text-purple-800', borderColor: 'border-l-4 border-l-purple-500', icon: Truck },
  out_for_delivery: { label: 'Out for Delivery', color: 'bg-indigo-100 text-indigo-800', borderColor: 'border-l-4 border-l-indigo-500', icon: Truck },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-800', borderColor: 'border-l-4 border-l-green-500', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800', borderColor: 'border-l-4 border-l-red-500', icon: XCircle },
  arrange_shipment: { label: 'Arrange Shipment', color: 'bg-orange-100 text-orange-800', borderColor: 'border-l-4 border-l-orange-500', icon: Handshake },
  pending_offer: { label: 'Pending Offer', color: 'bg-amber-100 text-amber-800', borderColor: 'border-l-4 border-l-amber-500', icon: MessageCircle },
  default: { label: 'Unknown', color: 'bg-gray-100 text-gray-800', borderColor: 'border-l-4 border-l-gray-500', icon: Clock }
};

const STATUS_TABS = [
  { id: 'all', label: 'All', icon: List },
  { id: 'pending_shipment', label: 'Pending', icon: Clock },
  { id: 'to_ship', label: 'To Process', icon: Loader2 },
  { id: 'ready_for_pickup', label: 'To Pickup', icon: Store },
  { id: 'waiting_rider', label: 'Waiting for Rider', icon: UserRoundCheck },
  { id: 'shipped', label: 'Shipped', icon: Ship },
  { id: 'completed', label: 'Completed', icon: CheckCircle },
  { id: 'cancelled', label: 'Cancelled', icon: XCircle }
];

function ConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  children?: React.ReactNode;
}) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-auto">
          <SheetHeader className="mb-4">
            <SheetTitle>{title}</SheetTitle>
            <SheetDescription>{description}</SheetDescription>
          </SheetHeader>
          {children && <div className="px-1 pb-4">{children}</div>}
          <SheetFooter className="flex flex-col gap-2 sm:flex-col">
            <Button variant="default" onClick={onConfirm} className="w-full">{confirmText}</Button>
            <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full">{cancelText}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {children && <div className="py-2">{children}</div>}
        <DialogFooter className="flex gap-2 sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>{cancelText}</Button>
          <Button variant="default" onClick={onConfirm}>{confirmText}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function SellerOrderList({ loaderData }: Route.ComponentProps) {
  const { userId, shopId, orders: initialOrders } = loaderData;
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<string>('all');
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [availableActions, setAvailableActions] = useState<Record<string, string[]>>({});
  const [loadingActions, setLoadingActions] = useState<Record<string, boolean>>({});
  const [deliveryStatuses, setDeliveryStatuses] = useState<Record<string, DeliveryInfo>>({});
  const [pickupDate, setPickupDate] = useState<Date | undefined>(undefined);
  const [pickupCalendarOpen, setPickupCalendarOpen] = useState(false);
  const [deliveryMethodFilter, setDeliveryMethodFilter] = useState<string>('all');
  const [confirmationState, setConfirmationState] = useState<{
    open: boolean;
    type: 'confirm' | 'cancel' | 'prepare' | 'ready_for_pickup' | 'picked_up' | null;
    orderId: string | null;
    order: Order | null;
  }>({ open: false, type: null, orderId: null, order: null });

  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const hasPendingDeliveryOffer = (order: Order): boolean =>
    order.delivery_info?.status === 'pending_offer';

  const isDeliveryOrder = (order: Order): boolean => {
    const method = order.delivery_method || order.shipping_method || '';
    return !(method?.toLowerCase().includes('pickup') || method?.toLowerCase().includes('store'));
  };

  const isWaitingForRider = (order: Order): boolean =>
    order.status?.toLowerCase() === 'to_ship' &&
    order.delivery_info?.status === 'pending_offer' &&
    !!order.delivery_info?.rider_name;

  const refreshOrders = async () => {
    if (!shopId) return;
    setLoading(true);
    try {
      const response = await AxiosInstance.get<ApiResponse>('/seller-order-list/order_list/', {
        params: { shop_id: shopId }
      });
      if (response.data.success) {
        setOrders(response.data.data || []);
        setAvailableActions({});
        setDeliveryStatuses({});
        toast.success("Orders refreshed", { description: "Order list has been updated." });
      }
    } catch (error: any) {
      toast.error("Failed to load orders", { description: "Please try again later." });
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableActions = async (orderId: string) => {
    if (!shopId || loadingActions[orderId]) return;
    setLoadingActions(prev => ({ ...prev, [orderId]: true }));
    try {
      const response = await AxiosInstance.get<AvailableActionsResponse>(
        `/seller-order-list/${orderId}/available_actions/`,
        { params: { shop_id: shopId } }
      );
      if (response.data.success) {
        setAvailableActions(prev => ({
          ...prev,
          [orderId]: response.data.data.available_actions || []
        }));
      }
    } catch (error: any) {
      console.error('Error loading available actions:', error);
    } finally {
      setLoadingActions(prev => ({ ...prev, [orderId]: false }));
    }
  };

  const handlePrepareShipment = async (orderId: string) => {
    try {
      setLoadingActions(prev => ({ ...prev, [orderId]: true }));
      const response = await AxiosInstance.post(
        `/seller-order-list/${orderId}/prepare_shipment/`,
        {},
        { params: { shop_id: shopId } }
      );
      if (response.data.success) {
        const { updated_order, updated_available_actions } = response.data.data;
        setOrders(prev => prev.map(o => o.order_id === orderId ? { ...updated_order, order_id: orderId } : o));
        if (updated_available_actions) {
          setAvailableActions(prev => ({ ...prev, [orderId]: updated_available_actions }));
        }
        toast.success("Order prepared for shipment", {
          description: response.data.message || "The order is now ready for shipping arrangements."
        });
      }
    } catch (error: any) {
      toast.error("Failed to prepare shipment", {
        description: error.response?.data?.message || "Please try again."
      });
    } finally {
      setLoadingActions(prev => ({ ...prev, [orderId]: false }));
    }
  };

  const handlePrintWaybill = async (orderId: string) => {
    try {
      setLoadingActions(prev => ({ ...prev, [orderId]: true }));
      const response = await AxiosInstance.get(
        `/seller-order-list/${orderId}/generate_waybill/`,
        {
          params: { shop_id: shopId },
          headers: { 'X-User-Id': userId },
          responseType: 'blob'
        }
      );
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `waybill_${orderId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("Waybill downloaded");
    } catch (error: any) {
      toast.error("Failed to generate waybill", {
        description: error.response?.data?.message || "Please try again."
      });
    } finally {
      setLoadingActions(prev => ({ ...prev, [orderId]: false }));
    }
  };

  useEffect(() => {
    if (shopId && orders.length > 0) {
      orders.slice(0, 10).forEach(order => {
        if (!availableActions[order.order_id]) loadAvailableActions(order.order_id);
      });
    }
  }, [shopId, orders]);

  const formatCustomerName = (user: { first_name: string; last_name: string }) =>
    `${user.first_name} ${user.last_name}`;

  const isCancelledOrder = (order: Order) => order.status?.toLowerCase() === 'cancelled';
  const isPickupOrder = (order: Order) => order.is_pickup === true;

  const getStatusBadge = (status: string, order: Order) => {
    const isPickup = isPickupOrder(order);
    const hasPendingOffer = hasPendingDeliveryOffer(order);
    const hasActiveDeliveryPending = order.delivery_info?.status === 'pending';
    let statusKey = (status || 'default').toLowerCase();
    if (hasPendingOffer) statusKey = 'pending_offer';
    else if (hasActiveDeliveryPending && statusKey === 'arrange_shipment') statusKey = 'pending_offer';
    else if (isPickup && statusKey === 'pending_shipment') statusKey = 'ready_for_pickup';
    const config = STATUS_CONFIG[statusKey as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.default;
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
      return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch { return ''; }
  };

  const formatCurrency = (amount: number) =>
    `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

  const getFilteredOrders = () => {
    let filtered = orders.filter(order => {
      if (!searchTerm) return true;
      const searchLower = searchTerm.toLowerCase();
      return (
        formatCustomerName(order.user).toLowerCase().includes(searchLower) ||
        order.order_id.toLowerCase().includes(searchLower) ||
        order.user.email.toLowerCase().includes(searchLower) ||
        order.items.some(item => item.cart_item?.product?.name?.toLowerCase().includes(searchLower))
      );
    });
    
    if (deliveryMethodFilter !== 'all') {
      filtered = filtered.filter(order => {
        const method = (order.delivery_method || order.shipping_method || '').toLowerCase();
        if (deliveryMethodFilter === 'pickup') {
          return method.includes('pickup') || method.includes('store') || order.is_pickup === true;
        } else if (deliveryMethodFilter === 'delivery') {
          return !method.includes('pickup') && !method.includes('store') && order.is_pickup !== true;
        }
        return true;
      });
    }
    
    if (activeTab !== 'all') {
      switch (activeTab) {
        case 'pending_shipment': filtered = filtered.filter(o => o.status?.toLowerCase() === 'pending_shipment'); break;
        case 'to_ship': filtered = filtered.filter(o => o.status?.toLowerCase() === 'to_ship'); break;
        case 'ready_for_pickup': filtered = filtered.filter(o => o.status?.toLowerCase() === 'ready_for_pickup'); break;
        case 'waiting_rider': filtered = filtered.filter(o => isWaitingForRider(o)); break;
        case 'shipped': filtered = filtered.filter(o => ['shipped', 'in_transit', 'out_for_delivery'].includes(o.status?.toLowerCase() || '')); break;
        case 'completed': filtered = filtered.filter(o => o.status?.toLowerCase() === 'completed'); break;
        case 'cancelled': filtered = filtered.filter(o => o.status?.toLowerCase() === 'cancelled'); break;
        default: filtered = filtered.filter(o => o.status?.toLowerCase() === activeTab.toLowerCase());
      }
    }
    return filtered;
  };

  const filteredOrders = getFilteredOrders();

  const counts = {
    all: orders.length,
    pending_shipment: orders.filter(o => o.status?.toLowerCase() === 'pending_shipment').length,
    to_ship: orders.filter(o => o.status?.toLowerCase() === 'to_ship').length,
    ready_for_pickup: orders.filter(o => o.status?.toLowerCase() === 'ready_for_pickup').length,
    waiting_rider: orders.filter(o => isWaitingForRider(o)).length,
    shipped: orders.filter(o => ['shipped', 'in_transit', 'out_for_delivery'].includes(o.status?.toLowerCase() || '')).length,
    completed: orders.filter(o => o.status?.toLowerCase() === 'completed').length,
    cancelled: orders.filter(o => o.status?.toLowerCase() === 'cancelled').length,
  };

  const triggerRiderAssignment = async (orderId: string) => {
    try {
      const response = await AxiosInstance.post('/seller-order-list/assign_deliveries/', {}, { params: { order_id: orderId } });
      if (response.data.success) {
        setTimeout(async () => {
          try {
            await AxiosInstance.post('/seller-order-list/check_delivery_responses/', {}, { params: { order_id: orderId } });
          } catch (error) { console.error('Error checking delivery responses:', error); }
        }, 2000);
      }
    } catch (error: any) { console.error('Error triggering rider assignment:', error); }
  };

  const handleUpdateStatus = async (orderId: string, actionType: string, extraPayload?: Record<string, any>) => {
    try {
      const response = await AxiosInstance.patch(
        `/seller-order-list/${orderId}/update_status/`,
        { action_type: actionType, ...extraPayload },
        { params: { shop_id: shopId } }
      );
      if (response.data.success) {
        const { updated_order, updated_available_actions } = response.data.data;
        setOrders(prev => prev.map(o => o.order_id === orderId ? { ...updated_order, order_id: orderId } : o));
        if (updated_available_actions) {
          setAvailableActions(prev => ({ ...prev, [orderId]: updated_available_actions }));
        }
        try {
          const backendStatus = String(response.data.data?.status || '').toLowerCase();
          const updatedOrderStatus = String((updated_order as any)?.status || '').toLowerCase();
          const movedToProcessing = backendStatus === 'processing' || updatedOrderStatus === 'to_ship';
          if (actionType === 'confirm' && movedToProcessing) {
            setActiveTab('to_ship');
            const currentOrder = orders.find(o => o.order_id === orderId);
            if (currentOrder && isDeliveryOrder(currentOrder)) {
              await triggerRiderAssignment(orderId);
              toast.info("Rider assignment initiated", { description: "Looking for available riders for this delivery order." });
            }
          }
        } catch (e) { /* ignore */ }
        toast.success("Order status updated", { description: response.data.message || `Order ${actionType} successfully` });
      }
    } catch (error: any) {
      toast.error("Failed to update order status", { description: error.response?.data?.message || error.message || "Please try again." });
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    try {
      const response = await AxiosInstance.patch(
        `/seller-order-list/${orderId}/update_status/`,
        { action_type: 'cancel' },
        { params: { shop_id: shopId } }
      );
      if (response.data.success) {
        await refreshOrders();
        await loadAvailableActions(orderId);
        toast.success("Order cancelled");
      }
    } catch (error: any) {
      toast.error("Failed to cancel order", { description: error.response?.data?.message || "Please try again." });
    }
  };

  const handleConfirmAction = async () => {
    if (!confirmationState.orderId || !confirmationState.type) return;

    if (
      confirmationState.type === 'confirm' &&
      confirmationState.order &&
      isCashOnPickup(confirmationState.order) &&
      !pickupDate
    ) {
      toast.error("Please select a pickup date before confirming.");
      return;
    }

    setConfirmationState(prev => ({ ...prev, open: false }));

    if (confirmationState.type === 'confirm') {
      const extra = pickupDate ? { pickup_date: format(pickupDate, "yyyy-MM-dd'T'HH:mm:ss") } : undefined;
      await handleUpdateStatus(confirmationState.orderId, 'confirm', extra);
    } else if (confirmationState.type === 'cancel') {
      await handleCancelOrder(confirmationState.orderId);
    } else if (confirmationState.type === 'prepare') {
      await handlePrepareShipment(confirmationState.orderId);
    } else if (confirmationState.type === 'ready_for_pickup') {
      await handleUpdateStatus(confirmationState.orderId, 'ready_for_pickup');
    } else if (confirmationState.type === 'picked_up') {
      await handleUpdateStatus(confirmationState.orderId, 'picked_up');
    }

    setPickupDate(undefined);
    setPickupCalendarOpen(false);
  };

  const getTabCount = (tabId: string) => counts[tabId as keyof typeof counts] ?? 0;

  const getActionButtons = (order: Order) => {
    const isCancelled = isCancelledOrder(order);
    const actions = availableActions[order.order_id] || [];
    const isLoading = loadingActions[order.order_id];
    const isPending = ['pending_shipment', 'pending'].includes(order.status?.toLowerCase() || '');
    const canCancel = !isCancelled && !['cancelled', 'completed', 'refunded'].includes(order.status?.toLowerCase() || '');
    const isPickup = isPickupOrder(order);

    if (isLoading) {
      return (
        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" disabled>
          <Loader2 className="w-3 h-3 animate-spin" />
        </Button>
      );
    }

    if (isPending) {
      return (
        <div className="flex gap-1 items-center">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[10px]"
            onClick={(e) => {
              e.stopPropagation();
              setPickupDate(undefined);
              setPickupCalendarOpen(false);
              setConfirmationState({ open: true, type: 'confirm', orderId: order.order_id, order });
            }}
          >
            <CheckCircle className="mr-1 w-3 h-3 text-green-600" /> Confirm
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={`h-6 px-2 text-[10px] ${canCancel ? '' : 'opacity-50 cursor-not-allowed text-gray-400'}`}
            disabled={!canCancel}
            onClick={(e) => {
              e.stopPropagation();
              if (!canCancel) {
                toast.error("Cannot cancel", { description: "This order cannot be cancelled at this stage." });
                return;
              }
              setConfirmationState({ open: true, type: 'cancel', orderId: order.order_id, order });
            }}
          >
            <Ban className="mr-1 w-3 h-3 text-red-600" /> Cancel
          </Button>
        </div>
      );
    }

    return (
      <>
        {isMobile ? (
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" className="h-6 w-6 p-0">
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-auto max-h-[80vh] overflow-y-auto">
              <div className="space-y-4 p-4">
                <h3 className="text-sm font-semibold">Order Actions</h3>
                <div className="flex flex-col gap-2">
                  <Link
                    to={`/seller/seller-order-list/${order.order_id}`}
                    className="inline-flex items-center gap-2 px-2 py-1.5 text-sm rounded-md hover:bg-muted transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Eye className="h-4 w-4" />
                    View Details
                  </Link>
                  {actions.includes('ready_for_pickup') && isPickup && (
                    <Button variant="ghost" size="sm" className="h-8 text-sm justify-start"
                      onClick={(e) => { e.stopPropagation(); setConfirmationState({ open: true, type: 'ready_for_pickup', orderId: order.order_id, order }); }}
                    >
                      <Store className="mr-2 h-4 w-4 text-blue-600" /> Mark Ready for Pickup
                    </Button>
                  )}
                  {actions.includes('picked_up') && isPickup && (
                    <Button variant="ghost" size="sm" className="h-8 text-sm justify-start"
                      onClick={(e) => { e.stopPropagation(); setConfirmationState({ open: true, type: 'picked_up', orderId: order.order_id, order }); }}
                    >
                      <CheckCircle className="mr-2 h-4 w-4 text-green-600" /> Mark as Picked Up
                    </Button>
                  )}
                  {actions.includes('prepare_shipment') && !isPickup && (
                    <Button variant="ghost" size="sm" className="h-8 text-sm justify-start"
                      onClick={(e) => { e.stopPropagation(); setConfirmationState({ open: true, type: 'prepare', orderId: order.order_id, order }); }}
                    >
                      <Package2 className="mr-2 h-4 w-4 text-blue-600" /> Prepare Shipment
                    </Button>
                  )}
                  {actions.includes('print_waybill') && (
                    <Button variant="ghost" size="sm" className="h-8 text-sm justify-start"
                      onClick={(e) => { e.stopPropagation(); handlePrintWaybill(order.order_id); }}
                      disabled={loadingActions[order.order_id]}
                    >
                      <Printer className="mr-2 h-4 w-4 text-blue-600" />
                      {loadingActions[order.order_id] ? 'Loading...' : 'Print Waybill'}
                    </Button>
                  )}
                  {canCancel && (
                    <Button variant="ghost" size="sm" className="h-8 text-sm justify-start"
                      onClick={(e) => { e.stopPropagation(); setConfirmationState({ open: true, type: 'cancel', orderId: order.order_id, order }); }}
                    >
                      <Ban className="mr-2 h-4 w-4 text-red-600" /> Cancel
                    </Button>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        ) : (
          <div className="flex gap-1 items-center">
            {actions.includes('ready_for_pickup') && isPickup && (
              <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]"
                onClick={(e) => { e.stopPropagation(); setConfirmationState({ open: true, type: 'ready_for_pickup', orderId: order.order_id, order }); }}
              >
                <Store className="mr-1 w-3 h-3 text-blue-600" /> Ready
              </Button>
            )}
            {actions.includes('picked_up') && isPickup && (
              <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]"
                onClick={(e) => { e.stopPropagation(); setConfirmationState({ open: true, type: 'picked_up', orderId: order.order_id, order }); }}
              >
                <CheckCircle className="mr-1 w-3 h-3 text-green-600" /> Picked Up
              </Button>
            )}
            {actions.includes('prepare_shipment') && !isPickup && (
              <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]"
                onClick={(e) => { e.stopPropagation(); setConfirmationState({ open: true, type: 'prepare', orderId: order.order_id, order }); }}
              >
                <Package2 className="mr-1 w-3 h-3 text-blue-600" /> Prepare
              </Button>
            )}
            {actions.includes('print_waybill') && (
              <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]"
                onClick={(e) => { e.stopPropagation(); handlePrintWaybill(order.order_id); }}
                disabled={loadingActions[order.order_id]}
              >
                <Printer className="mr-1 w-3 h-3 text-blue-600" />
                {loadingActions[order.order_id] ? '...' : 'Waybill'}
              </Button>
            )}
            {canCancel && (
              <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]"
                onClick={(e) => { e.stopPropagation(); setConfirmationState({ open: true, type: 'cancel', orderId: order.order_id, order }); }}
              >
                <Ban className="mr-1 w-3 h-3 text-red-600" /> Cancel
              </Button>
            )}
          </div>
        )}
      </>
    );
  };

  const getProductImageUrl = (item: OrderItem): string => {
    if (item.cart_item?.product?.variant_image) return item.cart_item.product.variant_image;
    if (item.cart_item?.product?.primary_image?.url) return item.cart_item.product.primary_image.url;
    if (item.cart_item?.product?.media?.length) return item.cart_item.product.media[0].url;
    return '/Crimsotech.png';
  };

  const getOrderBorderClass = (order: Order): string => {
    const isPickup = isPickupOrder(order);
    const hasPendingOffer = hasPendingDeliveryOffer(order);
    const isCancelled = isCancelledOrder(order);
    let statusKey = (order.status || 'default').toLowerCase();
    if (hasPendingOffer) statusKey = 'pending_offer';
    else if (isPickup && statusKey === 'pending_shipment') statusKey = 'ready_for_pickup';
    else if (isCancelled) statusKey = 'cancelled';
    const config = STATUS_CONFIG[statusKey as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.default;
    return config.borderColor;
  };

  const showPickupDateField =
    confirmationState.type === 'confirm' &&
    confirmationState.order !== null &&
    isCashOnPickup(confirmationState.order);

  const getDialogTitle = () => {
    switch (confirmationState.type) {
      case 'confirm': return "Confirm Order";
      case 'cancel': return "Cancel Order";
      case 'prepare': return "Prepare Shipment";
      case 'ready_for_pickup': return "Mark as Ready for Pickup";
      case 'picked_up': return "Mark as Picked Up";
      default: return "";
    }
  };

  const getDialogDescription = () => {
    switch (confirmationState.type) {
      case 'confirm': return "Are you sure you want to confirm this order?";
      case 'cancel': return "Are you sure you want to cancel this order? This action cannot be undone.";
      case 'prepare': return "Are you sure you want to prepare this order for shipment?";
      case 'ready_for_pickup': return "Mark this order as ready for customer pickup?";
      case 'picked_up': return "Confirm that the customer has picked up this order?";
      default: return "";
    }
  };

  const getConfirmText = () => {
    switch (confirmationState.type) {
      case 'confirm': return "Yes, Confirm";
      case 'cancel': return "Yes, Cancel";
      case 'prepare': return "Yes, Prepare";
      case 'ready_for_pickup': return "Yes, Mark Ready";
      case 'picked_up': return "Yes, Picked Up";
      default: return "Confirm";
    }
  };

  return (
    <SidebarLayout>
      <div className="space-y-3 p-3">
        <div className="mb-2">
          <h1 className="text-lg font-bold">Order Management</h1>
          <p className="text-gray-500 text-xs">Manage customer orders and shipments</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-2">
          <div className="bg-white rounded-lg border p-3 shadow-sm"><div className="text-xl font-bold">{counts.all}</div><div className="text-xs text-muted-foreground">Total Orders</div></div>
          <div className="bg-white rounded-lg border p-3 shadow-sm"><div className="text-xl font-bold text-yellow-600">{counts.pending_shipment}</div><div className="text-xs text-muted-foreground">Pending</div></div>
          <div className="bg-white rounded-lg border p-3 shadow-sm"><div className="text-xl font-bold text-amber-600">{counts.to_ship}</div><div className="text-xs text-muted-foreground">To Process</div></div>
          <div className="bg-white rounded-lg border p-3 shadow-sm"><div className="text-xl font-bold text-blue-500">{counts.ready_for_pickup}</div><div className="text-xs text-muted-foreground">To Pickup</div></div>
          <div className="bg-white rounded-lg border p-3 shadow-sm"><div className="text-xl font-bold text-orange-600">{counts.waiting_rider}</div><div className="text-xs text-muted-foreground">Waiting for Rider</div></div>
          <div className="bg-white rounded-lg border p-3 shadow-sm"><div className="text-xl font-bold text-blue-600">{counts.shipped}</div><div className="text-xs text-muted-foreground">Shipped</div></div>
          <div className="bg-white rounded-lg border p-3 shadow-sm"><div className="text-xl font-bold text-green-600">{counts.completed}</div><div className="text-xs text-muted-foreground">Completed</div></div>
        </div>

        <div className="bg-white rounded-lg border shadow-sm">
          <div className="p-3">
            {!userId ? (
              <div className="text-center py-4 text-muted-foreground">
                <div className="mb-2 text-xs">User authentication required</div>
                <Button size="sm" asChild><Link to="/login">Please log in</Link></Button>
              </div>
            ) : !shopId ? (
              <div className="text-center py-4 text-muted-foreground">
                <div className="mb-2 text-xs">Shop not found</div>
                <Button size="sm" asChild><Link to="/seller/create-shop">Create a shop first</Link></Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
                  <Input
                    placeholder="Search orders by ID, customer, or product..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 text-sm h-8"
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="flex items-center space-x-1 overflow-x-auto">
                    {STATUS_TABS.map((tab) => {
                      const Icon = tab.icon;
                      const count = getTabCount(tab.id);
                      const isActive = activeTab === tab.id;
                      return (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                          className={`flex items-center gap-1 px-2 py-1.5 rounded text-xs whitespace-nowrap ${isActive ? 'bg-blue-50 text-blue-600 border border-blue-200' : 'text-gray-600 hover:bg-gray-100'}`}
                        >
                          <Icon className="w-3 h-3" />
                          <span>{tab.label}</span>
                          {count > 0 && (
                            <span className={`text-[10px] px-1 py-0.5 rounded ${isActive ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>{count}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  
                  <div className="flex items-center gap-2 ml-auto">
                    <Label htmlFor="delivery-filter" className="text-xs whitespace-nowrap">Filter by:</Label>
                    <select
                      id="delivery-filter"
                      value={deliveryMethodFilter}
                      onChange={(e) => setDeliveryMethodFilter(e.target.value)}
                      className="h-8 rounded-md border border-input bg-background px-3 py-1 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <option value="all">All Orders</option>
                      <option value="pickup">Pickup from Store</option>
                      <option value="delivery">Standard Delivery</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                  {filteredOrders.length === 0 ? (
                    <div className="text-center py-4">
                      <ShoppingCart className="mx-auto h-6 w-6 text-gray-300 mb-2" />
                      <p className="text-gray-500 text-xs">
                        {activeTab === 'all' ? 'No orders found' :
                         activeTab === 'pending_shipment' ? 'No pending orders' :
                         activeTab === 'to_ship' ? 'No orders to process' :
                         activeTab === 'waiting_rider' ? 'No orders waiting for rider' :
                         activeTab === 'shipped' ? 'No shipped orders' :
                         activeTab === 'ready_for_pickup' ? 'No orders ready for pickup' :
                         activeTab === 'completed' ? 'No completed orders' :
                         'No cancelled orders'}
                      </p>
                    </div>
                  ) : (
                    filteredOrders.map((order) => {
                      const primaryItem = order.items[0];
                      const customerName = formatCustomerName(order.user);
                      const waitingForRider = isWaitingForRider(order);
                      const borderClass = getOrderBorderClass(order);
                      const dbOrderStatus = String((order as any).order_status || '').toLowerCase();
                      const uiStatus = String(order.status || '').toLowerCase();

                      return (
                        <div key={order.order_id} className={`bg-white rounded-lg border overflow-hidden ${borderClass}`}>
                          <div className="p-3">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1 min-w-0">
                                {waitingForRider && (
                                  <div className="bg-orange-50 p-2 rounded text-[10px] text-orange-700 mb-1">
                                    <div className="font-medium flex items-center gap-1">
                                      <UserRoundCheck className="w-3 h-3" />
                                      Waiting for rider {order.delivery_info?.rider_name} to accept the order
                                    </div>
                                  </div>
                                )}
                                {activeTab === 'to_ship' && order.delivery_info?.status === 'pending' && order.delivery_info?.rider_name && !waitingForRider && (
                                  <div className="bg-amber-50 p-2 rounded text-[10px] text-amber-700 mb-1">
                                    <div className="font-medium">Waiting for rider to accept the order {order.delivery_info.rider_name}</div>
                                  </div>
                                )}
                                {activeTab === 'to_ship' && String(order.delivery_info?.status || '').toLowerCase() === 'accepted' && (
                                  (dbOrderStatus === 'processing' || (!dbOrderStatus && uiStatus === 'to_ship')) && (
                                    <div className="bg-amber-50 p-2 rounded text-[10px] text-amber-700 mb-1">
                                      <div className="font-medium">Rider will pick up the order</div>
                                    </div>
                                  )
                                )}
                                <div className="flex items-center gap-2 mb-1">
                                  <Package className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                                  <span className="text-xs font-medium truncate">
                                    {primaryItem?.cart_item?.product?.name || 'Order Items'}
                                    {order.items.length > 1 && ` +${order.items.length - 1} more`}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-[10px] text-gray-500">
                                  <span className="truncate">{order.order_id}</span>
                                  <span>•</span>
                                  <span>{formatDate(order.created_at)}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                {getStatusBadge(order.status, order)}
                              </div>
                            </div>

                            <div className="mb-2">
                              <div className="flex items-center gap-2 text-[10px] text-gray-600 mb-1">
                                <User className="w-2.5 h-2.5" />
                                <span className="truncate">{customerName}</span>
                              </div>
                              <div className="flex items-center gap-2 text-[10px] text-gray-600 mb-1">
                                {isPickupOrder(order) ? (
                                  <><Store className="w-2.5 h-2.5" /><span>Pickup</span></>
                                ) : (
                                  <><Truck className="w-2.5 h-2.5" /><span>Delivery</span></>
                                )}
                                <span>•</span>
                                <span>Qty: {order.items.reduce((sum, item) => sum + item.quantity, 0)}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <div className="text-[10px] text-gray-500">{order.payment_method || 'N/A'}</div>
                                <div className="font-medium text-xs">{formatCurrency(order.total_amount)}</div>
                              </div>
                            </div>

                            <div className="my-2 flex gap-1">
                              {order.items.slice(0, 3).map((item, idx) => (
                                <div key={idx} className="h-12 w-12 rounded-md border bg-gray-50 flex items-center justify-center overflow-hidden">
                                  <img src={getProductImageUrl(item)} alt={item.cart_item?.product?.name || 'Product'} className="w-full h-full object-cover"
                                    onError={(e) => { (e.target as HTMLImageElement).src = '/Crimsotech.png'; }} />
                                </div>
                              ))}
                              {order.items.length > 3 && (
                                <div className="h-12 w-12 rounded-md border bg-gray-50 flex items-center justify-center">
                                  <span className="text-xs text-gray-500">+{order.items.length - 3}</span>
                                </div>
                              )}
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t mt-2">
                              <Link to={`/seller/seller-order-list/${order.order_id}`}
                                className="inline-flex items-center gap-1 h-6 px-2 text-[10px] hover:bg-gray-100 rounded-md transition-colors"
                              >
                                <Eye className="w-2.5 h-2.5" />
                                View Details
                              </Link>
                              <div className="flex gap-1">{getActionButtons(order)}</div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmationDialog
        open={confirmationState.open}
        onOpenChange={(open) => {
          setConfirmationState(prev => ({ ...prev, open }));
          if (!open) setPickupDate(undefined);
          setPickupCalendarOpen(false);
        }}
        onConfirm={handleConfirmAction}
        title={getDialogTitle()}
        description={getDialogDescription()}
        confirmText={getConfirmText()}
        cancelText="No, Keep"
      >
        {showPickupDateField && (
          <div className="space-y-2 rounded-lg border border-blue-100 bg-blue-50 p-3">
            <div className="flex items-center gap-2 text-xs font-medium text-blue-800">
              <Store className="w-3.5 h-3.5" />
              Cash on Pickup — Set Pickup Date
            </div>
            <div className="flex items-center gap-2 text-[10px] text-blue-600">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              <span>Customer will pick up at your shop address.</span>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-gray-700 flex items-center gap-1">
                <CalendarDays className="w-3 h-3" />
                Pickup Date <span className="text-red-500">*</span>
              </Label>
              <Popover open={pickupCalendarOpen} onOpenChange={setPickupCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={`w-full h-8 text-sm justify-start font-normal ${!pickupDate ? 'text-muted-foreground' : ''}`}
                  >
                    <CalendarDays className="mr-2 h-3.5 w-3.5" />
                    {pickupDate ? format(pickupDate, 'PPP p') : 'Pick a date & time'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={pickupDate}
                    onSelect={(date) => {
                      if (date) {
                        const existing = pickupDate;
                        const hours = existing ? existing.getHours() : 9;
                        const minutes = existing ? existing.getMinutes() : 0;
                        date.setHours(hours, minutes, 0, 0);
                        setPickupDate(date);
                      }
                    }}
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                    initialFocus
                  />
                  <div className="border-t p-3 flex items-center gap-2">
                    <ClockIcon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    <Label className="text-xs text-muted-foreground w-10 flex-shrink-0">Time</Label>
                    <Input
                      type="time"
                      className="h-7 text-xs flex-1"
                      value={pickupDate ? format(pickupDate, 'HH:mm') : '09:00'}
                      onChange={(e) => {
                        const [hours, minutes] = e.target.value.split(':').map(Number);
                        const updated = pickupDate ? new Date(pickupDate) : new Date();
                        updated.setHours(hours, minutes, 0, 0);
                        setPickupDate(updated);
                      }}
                    />
                    <Button
                      size="sm"
                      className="h-7 text-xs px-3"
                      onClick={() => setPickupCalendarOpen(false)}
                      disabled={!pickupDate}
                    >
                      Done
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        )}
      </ConfirmationDialog>
    </SidebarLayout>
  );
}