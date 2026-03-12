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
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { 
  ShoppingCart,
  Clock,
  User,
  Package,
  PhilippinePeso,
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
  Receipt,
  Clock as ClockIcon,
  CheckCheck,
  UserRoundCheck
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
  return [
    {
      title: "Seller Orders",
    },
  ];
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
  shop: {
    id: string;
    name: string;
  };
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
  approval: string;
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
  receipt_url?: string | null;
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
    is_pending_approval: boolean;
    available_actions: string[];
  };
}

// Add loader function to get session data and fetch orders
export async function loader({ request, context }: Route.LoaderArgs) {

  const { requireRole } = await import("~/middleware/role-require.server");
  const { fetchUserRole } = await import("~/middleware/role.server");

  let user = (context as any).user;
  if (!user) {
      user = await fetchUserRole({ request, context });
  }

  await requireRole(request, context, ["isCustomer"]);

  const { getSession } = await import('~/sessions.server');
  const session = await getSession(request.headers.get("Cookie"));
  
  const userId = session.get("userId");
  const shopId = session.get("shopId");
  
  // Fetch orders from API in loader
  let orders: Order[] = [];
  
  if (userId && shopId) {
    try {
      const axiosInstance = await import('~/components/axios/Axios').then(module => module.default);
      const response = await axiosInstance.get<ApiResponse>('/seller-order-list/order_list/', {
        params: {
          shop_id: shopId
        }
      });
      
      if (response.data.success) {
        orders = response.data.data || [];
      }
    } catch (error) {
      console.error('Error fetching orders in loader:', error);
    }
  }
  
  return { userId, shopId, orders };
}

// Status badges configuration - Updated to match backend mappings
const STATUS_CONFIG = {
  pending_shipment: { 
    label: 'Pending',  // Changed label to 'Pending' for better UX
    color: 'bg-yellow-100 text-yellow-800',
    borderColor: 'border-l-4 border-l-yellow-500',
    icon: Clock
  },
  to_ship: { 
    label: 'Processing',  // Changed label to 'Processing' for better UX
    color: 'bg-amber-100 text-amber-800',
    borderColor: 'border-l-4 border-l-amber-500',
    icon: Loader2
  },
  processing: {
    label: 'Processing',
    color: 'bg-amber-100 text-amber-800',
    borderColor: 'border-l-4 border-l-amber-500',
    icon: Loader2
  },
  ready_for_pickup: { 
    label: 'Ready for Pickup', 
    color: 'bg-blue-100 text-blue-800',
    borderColor: 'border-l-4 border-l-blue-500',
    icon: Store
  },
  shipped: { 
    label: 'Shipped', 
    color: 'bg-blue-100 text-blue-800',
    borderColor: 'border-l-4 border-l-blue-500',
    icon: Ship
  },
  in_transit: { 
    label: 'In Transit', 
    color: 'bg-purple-100 text-purple-800',
    borderColor: 'border-l-4 border-l-purple-500',
    icon: Truck
  },
  out_for_delivery: { 
    label: 'Out for Delivery', 
    color: 'bg-indigo-100 text-indigo-800',
    borderColor: 'border-l-4 border-l-indigo-500',
    icon: Truck
  },
  completed: { 
    label: 'Completed', 
    color: 'bg-green-100 text-green-800',
    borderColor: 'border-l-4 border-l-green-500',
    icon: CheckCircle
  },
  cancelled: { 
    label: 'Cancelled', 
    color: 'bg-red-100 text-red-800',
    borderColor: 'border-l-4 border-l-red-500',
    icon: XCircle
  },
  arrange_shipment: { 
    label: 'Arrange Shipment', 
    color: 'bg-orange-100 text-orange-800',
    borderColor: 'border-l-4 border-l-orange-500',
    icon: Handshake
  },
  pending_offer: { 
    label: 'Pending Offer', 
    color: 'bg-amber-100 text-amber-800',
    borderColor: 'border-l-4 border-l-amber-500',
    icon: MessageCircle
  },
  pending_approval: { 
    label: 'Pending Approval', 
    color: 'bg-purple-100 text-purple-800',
    borderColor: 'border-l-4 border-l-purple-500',
    icon: ClockIcon
  },
  approved: { 
    label: 'Approved', 
    color: 'bg-green-100 text-green-800',
    borderColor: 'border-l-4 border-l-green-500',
    icon: CheckCheck
  },
  default: { 
    label: 'Unknown', 
    color: 'bg-gray-100 text-gray-800',
    borderColor: 'border-l-4 border-l-gray-500',
    icon: Clock
  }
};

// Tabs configuration - Updated with Waiting for Rider tab
const STATUS_TABS = [
  { id: 'all', label: 'All', icon: List },
  { id: 'pending_shipment', label: 'Pending', icon: Clock },
  { id: 'to_ship', label: 'To Process', icon: Loader2 },
  { id: 'waiting_rider', label: 'Waiting for Rider', icon: UserRoundCheck },
  { id: 'shipped', label: 'Shipped', icon: Ship },
  { id: 'completed', label: 'Completed', icon: CheckCircle },
  { id: 'cancelled', label: 'Cancelled', icon: XCircle }
];

// Confirmation Modal/Sheet Component
function ConfirmationDialog({ 
  open, 
  onOpenChange, 
  onConfirm, 
  title, 
  description,
  confirmText = "Confirm",
  cancelText = "Cancel"
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void; 
  onConfirm: () => void; 
  title: string; 
  description: string;
  confirmText?: string;
  cancelText?: string;
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
          <SheetFooter className="flex flex-col gap-2 sm:flex-col">
            <Button variant="default" onClick={onConfirm} className="w-full">
              {confirmText}
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full">
              {cancelText}
            </Button>
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
        <DialogFooter className="flex gap-2 sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {cancelText}
          </Button>
          <Button variant="default" onClick={onConfirm}>
            {confirmText}
          </Button>
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
  const [pendingApprovalStatus, setPendingApprovalStatus] = useState<Record<string, boolean>>({});
  const [confirmationState, setConfirmationState] = useState<{
    open: boolean;
    type: 'confirm' | 'cancel' | 'prepare' | null;
    orderId: string | null;
  }>({
    open: false,
    type: null,
    orderId: null
  });
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  // Check if order has pending delivery offer
  const hasPendingDeliveryOffer = (order: Order): boolean => {
    return order.delivery_info?.status === 'pending_offer';
  };

  // Check if order has active delivery
  const hasActiveDelivery = (order: Order): boolean => {
    return !!(order.delivery_info?.delivery_id && 
             order.delivery_info?.status !== 'pending_offer');
  };

  // Check if order is for delivery (not pickup)
  const isDeliveryOrder = (order: Order): boolean => {
    const method = order.delivery_method || order.shipping_method || '';
    return !(method?.toLowerCase().includes('pickup') || method?.toLowerCase().includes('store'));
  };

  // Check if order is pending approval (has receipt_url and approval is pending)
  const isPendingApproval = (order: Order): boolean => {
    return order.approval?.toLowerCase() === 'pending' && 
           order.receipt_url !== null;
  };

  // Check if order is approved
  const isApproved = (order: Order): boolean => {
    return order.approval?.toLowerCase() === 'accepted';
  };

  // Check if order is waiting for rider approval
  const isWaitingForRider = (order: Order): boolean => {
    return order.status?.toLowerCase() === 'to_ship' && 
           order.delivery_info?.status === 'pending_offer' &&
           !!order.delivery_info?.rider_name;
  };

  // Refresh orders function
  const refreshOrders = async () => {
    if (!shopId) return;
    
    setLoading(true);
    try {
      const response = await AxiosInstance.get<ApiResponse>('/seller-order-list/order_list/', {
        params: {
          shop_id: shopId
        }
      });
      
      if (response.data.success) {
        setOrders(response.data.data || []);
        // Clear cached actions when orders refresh
        setAvailableActions({});
        setDeliveryStatuses({});
        setPendingApprovalStatus({});
        toast.success("Orders refreshed", {
          description: "Order list has been updated."
        });
      }
    } catch (error: any) {
      console.error('Error fetching orders:', error);
      toast.error("Failed to load orders", {
        description: "Please try again later."
      });
    } finally {
      setLoading(false);
    }
  };

  // Load available actions for an order
  const loadAvailableActions = async (orderId: string) => {
    if (!shopId || loadingActions[orderId]) return;
    
    setLoadingActions(prev => ({ ...prev, [orderId]: true }));
    
    try {
      const response = await AxiosInstance.get<AvailableActionsResponse>(
        `/seller-order-list/${orderId}/available_actions/`,
        {
          params: { shop_id: shopId }
        }
      );
      
      if (response.data.success) {
        const actions = response.data.data.available_actions || [];
        const isPendingApprovalFromBackend = response.data.data.is_pending_approval || false;
        
        // Store pending approval status
        setPendingApprovalStatus(prev => ({
          ...prev,
          [orderId]: isPendingApprovalFromBackend
        }));
        
        setAvailableActions(prev => ({
          ...prev,
          [orderId]: actions
        }));
      }
    } catch (error: any) {
      console.error('Error loading available actions:', error);
      toast.error("Failed to load actions", {
        description: "Could not load available actions for this order."
      });
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
        {
          params: { shop_id: shopId }
        }
      );
      
      if (response.data.success) {
        const { updated_order, updated_available_actions } = response.data.data;
        
        // Update the specific order in state
        setOrders(prevOrders => 
          prevOrders.map(order => 
            order.order_id === orderId 
              ? { ...updated_order, order_id: orderId }
              : order
          )
        );
        
        // Update available actions for this order
        if (updated_available_actions) {
          setAvailableActions(prev => ({
            ...prev,
            [orderId]: updated_available_actions
          }));
        }
        
        toast.success("Order prepared for shipment", {
          description: response.data.message || "The order is now ready for shipping arrangements."
        });
      }
    } catch (error: any) {
      console.error('Error preparing shipment:', error);
      toast.error("Failed to prepare shipment", {
        description: error.response?.data?.message || "Please try again."
      });
    } finally {
      setLoadingActions(prev => ({ ...prev, [orderId]: false }));
    }
  };

  // Load actions when component mounts or orders change
  useEffect(() => {
    if (shopId && orders.length > 0) {
      // Load actions for first few orders to start
      const ordersToLoad = orders.slice(0, 10);
      ordersToLoad.forEach(order => {
        if (!availableActions[order.order_id]) {
          loadAvailableActions(order.order_id);
        }
      });
    }
  }, [shopId, orders]);

  const formatCustomerName = (user: { first_name: string; last_name: string }) => {
    return `${user.first_name} ${user.last_name}`;
  };

  const toggleOrderExpansion = (orderId: string) => {
    const newExpanded = new Set(expandedOrders);
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId);
    } else {
      newExpanded.add(orderId);
    }
    setExpandedOrders(newExpanded);
  };

  // Check if order is cancelled
  const isCancelledOrder = (order: Order) => {
    return order.status?.toLowerCase() === 'cancelled';
  };

  // Check if order is for pickup
  const isPickupOrder = (order: Order) => {
    return order.is_pickup === true;
  };

  const getStatusBadge = (status: string, order: Order) => {
    const isPickup = isPickupOrder(order);
    const hasPendingOffer = hasPendingDeliveryOffer(order);
    const hasActiveDelivery = order.delivery_info?.status === 'pending';
    const pendingApproval = pendingApprovalStatus[order.order_id] || isPendingApproval(order);
    const approved = isApproved(order);

    let statusKey = (status || 'default').toLowerCase();

    // Override for special cases
    if (hasPendingOffer) statusKey = 'pending_offer';
    else if (hasActiveDelivery && statusKey === 'arrange_shipment') statusKey = 'pending_offer';
    else if (isPickup && statusKey === 'pending_shipment') statusKey = 'ready_for_pickup';
    else if (pendingApproval) statusKey = 'pending_approval';
    else if (approved) statusKey = 'approved';

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

  const getFilteredOrders = () => {
    let filtered = orders.filter(order => {
      if (!searchTerm) return true;
      const searchLower = searchTerm.toLowerCase();
      const customerName = formatCustomerName(order.user).toLowerCase();
      
      return (
        customerName.includes(searchLower) ||
        order.order_id.toLowerCase().includes(searchLower) ||
        order.user.email.toLowerCase().includes(searchLower) ||
        order.items.some(item => 
          item.cart_item?.product?.name?.toLowerCase().includes(searchLower)
        )
      );
    });

    if (activeTab !== 'all') {
      switch (activeTab) {
        case 'pending_shipment':
          // Pending tab shows orders with status 'pending_shipment'
          filtered = filtered.filter(order => 
            order.status?.toLowerCase() === 'pending_shipment'
          );
          break;
        case 'to_ship':
          // To Process tab shows orders with status 'to_ship'
          filtered = filtered.filter(order => 
            order.status?.toLowerCase() === 'to_ship'
          );
          break;
        case 'waiting_rider':
          // Waiting for Rider tab shows orders waiting for rider approval
          filtered = filtered.filter(order => isWaitingForRider(order));
          break;
        case 'shipped':
          // Shipped tab shows orders with status 'shipped' or 'in_transit' or 'out_for_delivery'
          filtered = filtered.filter(order => {
            const s = order.status?.toLowerCase();
            return ['shipped', 'in_transit', 'out_for_delivery'].includes(s || '');
          });
          break;
        case 'completed':
          // Completed tab shows orders with status 'completed'
          filtered = filtered.filter(order => 
            order.status?.toLowerCase() === 'completed'
          );
          break;
        case 'cancelled':
          // Cancelled tab shows orders with status 'cancelled'
          filtered = filtered.filter(order => 
            order.status?.toLowerCase() === 'cancelled'
          );
          break;
        default:
          filtered = filtered.filter(order => order.status?.toLowerCase() === activeTab.toLowerCase());
      }
    }

    return filtered;
  };

  const filteredOrders = getFilteredOrders();

  const counts = {
    all: orders.length,
    pending_shipment: orders.filter(o => o.status?.toLowerCase() === 'pending_shipment').length,
    to_ship: orders.filter(o => o.status?.toLowerCase() === 'to_ship').length,
    waiting_rider: orders.filter(o => isWaitingForRider(o)).length,
    shipped: orders.filter(o => {
      const s = o.status?.toLowerCase();
      return ['shipped', 'in_transit', 'out_for_delivery'].includes(s || '');
    }).length,
    completed: orders.filter(o => o.status?.toLowerCase() === 'completed').length,
    cancelled: orders.filter(o => o.status?.toLowerCase() === 'cancelled').length,
    pending_approval: orders.filter(o => pendingApprovalStatus[o.order_id] || isPendingApproval(o)).length
  };

  // MODIFIED: Function to trigger rider assignment
  const triggerRiderAssignment = async (orderId: string) => {
    try {
      console.log(`Triggering rider assignment for order: ${orderId}`);
      
      // Call the assign_deliveries endpoint
      const response = await AxiosInstance.post('/seller-order-list/assign_deliveries/', {}, {
        params: { order_id: orderId }
      });
      
      if (response.data.success) {
        console.log('Rider assignment triggered successfully:', response.data);
        
        // Also trigger check_delivery_responses after a short delay
        setTimeout(async () => {
          try {
            await AxiosInstance.post('/seller-order-list/check_delivery_responses/', {}, {
              params: { order_id: orderId }
            });
            console.log('Delivery responses check triggered');
          } catch (error) {
            console.error('Error checking delivery responses:', error);
          }
        }, 2000); // 2 second delay
      }
    } catch (error: any) {
      console.error('Error triggering rider assignment:', error);
      // Don't show error toast to user as this is a background process
    }
  };

  // MODIFIED: handleUpdateStatus function with rider assignment
  const handleUpdateStatus = async (orderId: string, actionType: string) => {
    try {
      const response = await AxiosInstance.patch(
        `/seller-order-list/${orderId}/update_status/`, 
        {
          action_type: actionType
        }, 
        {
          params: { shop_id: shopId }
        }
      );
      
      if (response.data.success) {
        const { updated_order, updated_available_actions } = response.data.data;
        
        // Update the specific order in state
        setOrders(prevOrders => 
          prevOrders.map(order => 
            order.order_id === orderId 
              ? { ...updated_order, order_id: orderId }
              : order
          )
        );
        
        // Update available actions for this order
        if (updated_available_actions) {
          setAvailableActions(prev => ({
            ...prev,
            [orderId]: updated_available_actions
          }));
        }

        // If the action was 'confirm' and backend moved order -> processing / to_ship,
        // switch user to the To Process tab
        try {
          const backendStatus = String(response.data.data?.status || '').toLowerCase();
          const updatedOrderStatus = String((updated_order as any)?.status || '').toLowerCase();
          const movedToProcessing = backendStatus === 'processing' || updatedOrderStatus === 'to_ship';
          if (actionType === 'confirm' && movedToProcessing) {
            setActiveTab('to_ship');
            
            // NEW: Check if order is for delivery (not pickup) and trigger rider assignment
            const currentOrder = orders.find(o => o.order_id === orderId);
            if (currentOrder && isDeliveryOrder(currentOrder)) {
              // Trigger rider assignment automatically
              await triggerRiderAssignment(orderId);
              
              toast.info("Rider assignment initiated", {
                description: "Looking for available riders for this delivery order."
              });
            }
          }
        } catch (e) {
          /* ignore */
        }
        
        toast.success("Order status updated", {
          description: response.data.message || `Order ${actionType} successfully`
        });
      }
    } catch (error: any) {
      console.error('Error updating order status:', error);
      toast.error("Failed to update order status", {
        description: error.response?.data?.message || error.message || "Please try again."
      });
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    try {
      const response = await AxiosInstance.patch(`/seller-order-list/${orderId}/update_status/`, {
        action_type: 'cancel'
      }, {
        params: { shop_id: shopId }
      });
      
      if (response.data.success) {
        await refreshOrders();
        await loadAvailableActions(orderId);
        toast.success("Order cancelled", {
          description: "Order cancelled successfully"
        });
      }
    } catch (error: any) {
      console.error('Error cancelling order:', error);
      toast.error("Failed to cancel order", {
        description: error.response?.data?.message || "Please try again."
      });
    }
  };

  const handleConfirmAction = async () => {
    if (!confirmationState.orderId || !confirmationState.type) return;
    
    setConfirmationState(prev => ({ ...prev, open: false }));
    
    if (confirmationState.type === 'confirm') {
      await handleUpdateStatus(confirmationState.orderId, 'confirm');
    } else if (confirmationState.type === 'cancel') {
      await handleCancelOrder(confirmationState.orderId);
    } else if (confirmationState.type === 'prepare') {
      await handlePrepareShipment(confirmationState.orderId);
    }
  };

  const getTabCount = (tabId: string) => {
    switch (tabId) {
      case 'all': return counts.all;
      case 'pending_shipment': return counts.pending_shipment;
      case 'to_ship': return counts.to_ship;
      case 'waiting_rider': return counts.waiting_rider;
      case 'shipped': return counts.shipped;
      case 'completed': return counts.completed;
      case 'cancelled': return counts.cancelled;
      default: return 0;
    }
  };

  const getActionButtons = (order: Order) => {
    const isCancelled = isCancelledOrder(order);
    const isPickup = isPickupOrder(order);
    const actions = availableActions[order.order_id] || [];
    const isLoading = loadingActions[order.order_id];
    const pendingApproval = pendingApprovalStatus[order.order_id] || isPendingApproval(order);
    const approved = isApproved(order);

    // Check if order is pending_shipment (show confirm button if not pending approval, including when approved)
    const isPending = order.status?.toLowerCase() === 'pending_shipment' && !pendingApproval;
    const canCancel = !isCancelled && !['cancelled', 'completed', 'refunded'].includes(order.status?.toLowerCase() || '');
    
    if (isLoading) {
      return (
        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" disabled>
          <Loader2 className="w-3 h-3 animate-spin" />
        </Button>
      );
    }

    // For pending orders that are not pending approval (including approved orders), show Confirm + Cancel quick-actions side-by-side
    if (isPending) {
      return (
        <div className="flex gap-1 items-center">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[10px]"
            onClick={(e) => { 
              e.stopPropagation(); 
              setConfirmationState({
                open: true,
                type: 'confirm',
                orderId: order.order_id
              });
            }}
            title="Confirm order"
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
                toast.error("Cannot cancel", {
                  description: "This order cannot be cancelled at this stage."
                });
                return;
              }
              setConfirmationState({
                open: true,
                type: 'cancel',
                orderId: order.order_id
              });
            }}
            title={canCancel ? 'Cancel order' : 'Cannot cancel this order'}
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
                  {/* CHANGED: View Details as Link */}
                  <Link 
                    to={`/seller/orders/${order.order_id}`}
                    className="inline-flex items-center gap-2 px-2 py-1.5 text-sm rounded-md hover:bg-muted transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Eye className="h-4 w-4" />
                    View Details
                  </Link>

                  {pendingApproval && order.receipt_url && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-sm justify-start"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(order.receipt_url || undefined, '_blank');
                      }}
                    >
                      <Receipt className="mr-2 h-4 w-4 text-purple-600" /> View Receipt
                    </Button>
                  )}

                  {actions.includes('prepare_shipment') && !pendingApproval && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-sm justify-start"
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmationState({
                          open: true,
                          type: 'prepare',
                          orderId: order.order_id
                        });
                      }}
                    >
                      <Package2 className="mr-2 h-4 w-4 text-blue-600" /> Prepare Shipment
                    </Button>
                  )}

                  {canCancel && !pendingApproval && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-sm justify-start"
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        setConfirmationState({
                          open: true,
                          type: 'cancel',
                          orderId: order.order_id
                        });
                      }}
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
            {pendingApproval && order.receipt_url && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[10px]"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(order.receipt_url || undefined, '_blank');
                }}
                title="View Receipt"
              >
                <Receipt className="mr-1 w-3 h-3 text-purple-600" /> Receipt
              </Button>
            )}

            {actions.includes('prepare_shipment') && !pendingApproval && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[10px]"
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmationState({
                    open: true,
                    type: 'prepare',
                    orderId: order.order_id
                  });
                }}
                title="Prepare for shipment"
              >
                <Package2 className="mr-1 w-3 h-3 text-blue-600" /> Prepare
              </Button>
            )}

            {canCancel && !pendingApproval && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[10px]"
                onClick={(e) => { 
                  e.stopPropagation(); 
                  setConfirmationState({
                    open: true,
                    type: 'cancel',
                    orderId: order.order_id
                  });
                }}
                title="Cancel order"
              >
                <Ban className="mr-1 w-3 h-3 text-red-600" /> Cancel
              </Button>
            )}
          </div>
        )}
      </>
    );
  };

  // Function to get product image URL with fallback
  const getProductImageUrl = (item: OrderItem): string => {
    // Try to get variant_image first (from the new response structure)
    if (item.cart_item?.product?.variant_image) {
      return item.cart_item.product.variant_image;
    }
    
    // Try to get primary_image if available
    if (item.cart_item?.product?.primary_image?.url) {
      return item.cart_item.product.primary_image.url;
    }
    
    // Try to get first media image if available
    if (item.cart_item?.product?.media && item.cart_item.product.media.length > 0) {
      return item.cart_item.product.media[0].url;
    }
    
    // Return fallback
    return '/Crimsotech.png';
  };

  // Function to get border color based on order status
  const getOrderBorderClass = (order: Order): string => {
    const pendingApproval = pendingApprovalStatus[order.order_id] || isPendingApproval(order);
    const approved = isApproved(order);
    const waitingForRider = isWaitingForRider(order);
    const isPickup = isPickupOrder(order);
    const hasPendingOffer = hasPendingDeliveryOffer(order);
    const isCancelled = isCancelledOrder(order);

    let statusKey = (order.status || 'default').toLowerCase();

    // Override for special cases
    if (hasPendingOffer) statusKey = 'pending_offer';
    else if (waitingForRider) statusKey = 'pending_offer';
    else if (isPickup && statusKey === 'pending_shipment') statusKey = 'ready_for_pickup';
    else if (pendingApproval) statusKey = 'pending_approval';
    else if (approved) statusKey = 'approved';
    else if (isCancelled) statusKey = 'cancelled';

    const config = STATUS_CONFIG[statusKey as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.default;
    return config.borderColor;
  };

  return (
    <SidebarLayout>
      <div className="space-y-3 p-3">
        {/* Header */}
        <div className="mb-2">
          <h1 className="text-lg font-bold">Order Management</h1>
          <p className="text-gray-500 text-xs">Manage customer orders and shipments</p>
          {counts.pending_approval > 0 && (
            <p className="text-xs text-purple-600 mt-1">
              {counts.pending_approval} order(s) pending admin approval
            </p>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6   gap-2">
          <div className="bg-white rounded-lg border p-3 shadow-sm">
            <div className="text-xl font-bold">{counts.all}</div>
            <div className="text-xs text-muted-foreground">Total Orders</div>
          </div>
          <div className="bg-white rounded-lg border p-3 shadow-sm">
            <div className="text-xl font-bold text-yellow-600">{counts.pending_shipment}</div>
            <div className="text-xs text-muted-foreground">Pending</div>
          </div>
          <div className="bg-white rounded-lg border p-3 shadow-sm">
            <div className="text-xl font-bold text-amber-600">{counts.to_ship}</div>
            <div className="text-xs text-muted-foreground">To Process</div>
          </div>
          <div className="bg-white rounded-lg border p-3 shadow-sm">
            <div className="text-xl font-bold text-orange-600">{counts.waiting_rider}</div>
            <div className="text-xs text-muted-foreground">Waiting for Rider</div>
          </div>
          <div className="bg-white rounded-lg border p-3 shadow-sm">
            <div className="text-xl font-bold text-blue-600">{counts.shipped}</div>
            <div className="text-xs text-muted-foreground">Shipped</div>
          </div>
          <div className="bg-white rounded-lg border p-3 shadow-sm">
            <div className="text-xl font-bold text-green-600">{counts.completed}</div>
            <div className="text-xs text-muted-foreground">Completed</div>
          </div>
        </div>

        {/* Main Content - Replaced Card with div */}
        <div className="bg-white rounded-lg border shadow-sm">
          <div className="p-3">
            {!userId ? (
              <div className="text-center py-4 text-muted-foreground">
                <div className="mb-2 text-xs">User authentication required</div>
                <Button size="sm" asChild>
                  <Link to="/login">Please log in</Link>
                </Button>
              </div>
            ) : !shopId ? (
              <div className="text-center py-4 text-muted-foreground">
                <div className="mb-2 text-xs">Shop not found</div>
                <Button size="sm" asChild>
                  <Link to="/seller/create-shop">Create a shop first</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
                  <Input
                    placeholder="Search orders by ID, customer, or product..."
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
                        onClick={() => setActiveTab(tab.id)}
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

                {/* Orders List */}
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
                         activeTab === 'completed' ? 'No completed orders' :
                         'No cancelled orders'}
                      </p>
                    </div>
                  ) : (
                    filteredOrders.map((order) => {
                      const isExpanded = expandedOrders.has(order.order_id);
                      const primaryItem = order.items[0];
                      const customerName = formatCustomerName(order.user);
                      const pendingApproval = pendingApprovalStatus[order.order_id] || isPendingApproval(order);
                      const approved = isApproved(order);
                      const waitingForRider = isWaitingForRider(order);
                      const borderClass = getOrderBorderClass(order);

                      // Determine DB/UI processing state (backend returns `order_status` when available)
                      const dbOrderStatus = String((order as any).order_status || '').toLowerCase();
                      const uiStatus = String(order.status || '').toLowerCase();
                      const isDbProcessing = dbOrderStatus === 'processing';
                      const isUiToShip = uiStatus === 'to_ship';
                      const isProcessingState = isDbProcessing || isUiToShip;
                      
                      return (
                        // Replaced Card with div and added border color
                        <div key={order.order_id} className={`bg-white rounded-lg border overflow-hidden ${borderClass}`}>
                          <div className="p-3">
                            {/* Top Section - Header */}
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1 min-w-0">
                                {/* Status note: show when order is processing and a rider is already assigned but delivery is still pending */}
                                {waitingForRider && (
                                  <div className="bg-orange-50 p-2 rounded text-[10px] text-orange-700 mb-1">
                                    <div className="font-medium flex items-center gap-1">
                                      <UserRoundCheck className="w-3 h-3" />
                                      Waiting for rider {order.delivery_info?.rider_name} to accept the order
                                    </div>
                                  </div>
                                )}

                                {activeTab === 'to_ship' && isProcessingState && order.delivery_info?.status === 'pending' && order.delivery_info?.rider_name && !waitingForRider && (
                                  <div className="bg-amber-50 p-2 rounded text-[10px] text-amber-700 mb-1">
                                    <div className="font-medium">Waiting for rider to accept the order {order.delivery_info.rider_name}</div>
                                  </div>
                                )}

                                {/* Show pickup note when delivery has been accepted (DB order.status = processing).
                                    Fallback: if `order.order_status` is missing, treat UI `status: 'to_ship'` as processing so note still appears. */}
                                {activeTab === 'to_ship' && String(order.delivery_info?.status || '').toLowerCase() === 'accepted' && (
                                  (dbOrderStatus === 'processing' || (!dbOrderStatus && uiStatus === 'to_ship')) && (
                                    <div className="bg-amber-50 p-2 rounded text-[10px] text-amber-700 mb-1">
                                      <div className="font-medium">Rider will pick up the order</div>
                                    </div>
                                  )
                                )}

                                {/* Show pending approval note */}
                                {pendingApproval && (
                                  <div className="bg-purple-50 p-2 rounded text-[10px] text-purple-700 mb-1">
                                    <div className="font-medium flex items-center gap-1">
                                      <Receipt className="w-3 h-3" />
                                      Pending admin approval for payment verification
                                    </div>
                                  </div>
                                )}

                                {/* Show approved note */}
                                {approved && (
                                  <div className="bg-green-50 p-2 rounded text-[10px] text-green-700 mb-1">
                                    <div className="font-medium flex items-center gap-1">
                                      <CheckCheck className="w-3 h-3" />
                                      Payment approved by admin
                                    </div>
                                  </div>
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
                                {/* CHANGED: Expand/collapse button removed */}
                              </div>
                            </div>

                            {/* Middle Section - Summary */}
                            <div className="mb-2">
                              <div className="flex items-center gap-2 text-[10px] text-gray-600 mb-1">
                                <User className="w-2.5 h-2.5" />
                                <span className="truncate">{customerName}</span>
                              </div>
                              <div className="flex items-center gap-2 text-[10px] text-gray-600 mb-1">
                                {isPickupOrder(order) ? (
                                  <>
                                    <Store className="w-2.5 h-2.5" />
                                    <span>Pickup</span>
                                  </>
                                ) : (
                                  <>
                                    <Truck className="w-2.5 h-2.5" />
                                    <span>Delivery</span>
                                  </>
                                )}
                                <span>•</span>
                                <span>Qty: {order.items.reduce((sum, item) => sum + item.quantity, 0)}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <div className="text-[10px] text-gray-500">
                                  {order.payment_method || 'N/A'}
                                </div>
                                <div className="font-medium text-xs">
                                  {formatCurrency(order.total_amount)}
                                </div>
                              </div>
                            </div>

                            {/* Product Images Preview */}
                            <div className="my-2 flex gap-1">
                              {order.items.slice(0, 3).map((item, idx) => (
                                <div key={idx} className="h-12 w-12 rounded-md border bg-gray-50 flex items-center justify-center overflow-hidden">
                                  <img 
                                    src={getProductImageUrl(item)}
                                    alt={item.cart_item?.product?.name || 'Product'}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      target.src = '/Crimsotech.png';
                                    }}
                                  />
                                </div>
                              ))}
                              {order.items.length > 3 && (
                                <div className="h-12 w-12 rounded-md border bg-gray-50 flex items-center justify-center">
                                  <span className="text-xs text-gray-500">+{order.items.length - 3}</span>
                                </div>
                              )}
                            </div>

                            {/* Bottom Section - Actions */}
                            <div className="flex items-center justify-between pt-2 border-t mt-2">
                              {/* CHANGED: View Details as Link instead of toggle button */}
                              <Link 
                                to={`/seller/seller-order-list/${order.order_id}`}
                                className="inline-flex items-center gap-1 h-6 px-2 text-[10px] hover:bg-gray-100 rounded-md transition-colors"
                              >
                                <Eye className="w-2.5 h-2.5" />
                                View Details
                              </Link>
                              
                              <div className="flex gap-1">
                                {getActionButtons(order)}
                              </div>
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

      {/* Confirmation Modal/Sheet */}  
      <ConfirmationDialog
        open={confirmationState.open}
        onOpenChange={(open) => setConfirmationState(prev => ({ ...prev, open }))}
        onConfirm={handleConfirmAction}
        title={
          confirmationState.type === 'confirm' ? "Confirm Order" :
          confirmationState.type === 'cancel' ? "Cancel Order" :
          confirmationState.type === 'prepare' ? "Prepare Shipment" : ""
        }
        description={
          confirmationState.type === 'confirm' ? "Are you sure you want to confirm this order?" :
          confirmationState.type === 'cancel' ? "Are you sure you want to cancel this order? This action cannot be undone." :
          confirmationState.type === 'prepare' ? "Are you sure you want to prepare this order for shipment?" : ""
        }
        confirmText={
          confirmationState.type === 'confirm' ? "Yes, Confirm" :
          confirmationState.type === 'cancel' ? "Yes, Cancel" :
          confirmationState.type === 'prepare' ? "Yes, Prepare" : "Confirm"
        }
        cancelText="No, Keep"
      />
    </SidebarLayout>
  );
}