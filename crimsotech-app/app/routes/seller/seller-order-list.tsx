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
  Handshake
} from 'lucide-react';
import AxiosInstance from '~/components/axios/Axios';
import { useIsMobile } from '~/hooks/use-mobile';
import { Sheet, SheetContent, SheetTrigger } from '~/components/ui/sheet';
import { toast } from 'sonner';

export function meta(): Route.MetaDescriptors {
  return [
    {
      title: "Seller Orders",
    },
  ];
}

interface DeliveryInfo {
  delivery_id?: string;
  rider_name?: string;
  status?: string;
  tracking_number?: string;
  estimated_delivery?: string;
  submitted_at?: string;
}

interface OrderItem {
  id: string;
  cart_item: {
    id: string;
    product: {
      id: string;
      name: string;
      price: number;
      variant: string;
      shop: {
        id: string;
        name: string;
      };
    };
    quantity: number;
  };
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
    available_actions: string[];
  };
}

interface DeliveryStatusResponse {
  success: boolean;
  message: string;
  data: {
    delivery_id: string;
    rider_name: string;
    status: string;
    submitted_at: string;
    order_id: string;
  };
}

// Add loader function to get session data and fetch orders
export async function loader({ request, context }: Route.LoaderArgs) {
  const { registrationMiddleware } = await import("~/middleware/registration.server");
  await registrationMiddleware({ request, context, params: {}, unstable_pattern: undefined } as any);
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
    icon: Clock
  },
  to_ship: { 
    label: 'Processing',  // Changed label to 'Processing' for better UX
    color: 'bg-amber-100 text-amber-800',
    icon: Loader2
  },
  processing: {
    label: 'Processing',
    color: 'bg-amber-100 text-amber-800',
    icon: Loader2
  },
  ready_for_pickup: { 
    label: 'Ready for Pickup', 
    color: 'bg-blue-100 text-blue-800',
    icon: Store
  },
  shipped: { 
    label: 'Shipped', 
    color: 'bg-blue-100 text-blue-800',
    icon: Ship
  },
  in_transit: { 
    label: 'In Transit', 
    color: 'bg-purple-100 text-purple-800',
    icon: Truck
  },
  out_for_delivery: { 
    label: 'Out for Delivery', 
    color: 'bg-indigo-100 text-indigo-800',
    icon: Truck
  },
  completed: { 
    label: 'Completed', 
    color: 'bg-green-100 text-green-800',
    icon: CheckCircle
  },
  cancelled: { 
    label: 'Cancelled', 
    color: 'bg-red-100 text-red-800',
    icon: XCircle
  },
  arrange_shipment: { 
    label: 'Arrange Shipment', 
    color: 'bg-orange-100 text-orange-800',
    icon: Handshake
  },
  pending_offer: { 
    label: 'Pending Offer', 
    color: 'bg-amber-100 text-amber-800',
    icon: MessageCircle
  },
  default: { 
    label: 'Unknown', 
    color: 'bg-gray-100 text-gray-800',
    icon: Clock
  }
};

// Tabs configuration
const STATUS_TABS = [
  { id: 'all', label: 'All', icon: List },
  { id: 'pending', label: 'Pending', icon: Clock },
  { id: 'to_process', label: 'To Process', icon: Loader2 },
  { id: 'shipped', label: 'Shipped', icon: Ship },
  { id: 'returns', label: 'Returns', icon: AlertCircle },
  { id: 'reviews', label: 'Reviews', icon: MessageCircle }
];

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
    return !(method.toLowerCase().includes('pickup') || method.toLowerCase().includes('store'));
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
        let actions = response.data.data.available_actions || [];
        
        // Check if order exists in current state
        const order = orders.find(o => o.order_id === orderId);
        
        // If order is in pending_shipment status, ensure 'confirm' action is available
        if (order && order.status === 'pending_shipment') {
          // If confirm is not in actions, add it
          if (!actions.includes('confirm')) {
            actions = ['confirm', ...actions];
          }
          
          // Only add 'prepare_shipment' for delivery orders
          if (isDeliveryOrder(order) && !actions.includes('prepare_shipment')) {
            actions = [...actions, 'prepare_shipment'];
          }
          
          // Always ensure cancel is available for pending orders
          if (!actions.includes('cancel')) {
            actions = [...actions, 'cancel'];
          }
        }
        
        setAvailableActions(prev => ({
          ...prev,
          [orderId]: actions
        }));
      }
    } catch (error: any) {
      console.error('Error loading available actions:', error);
    } finally {
      setLoadingActions(prev => ({ ...prev, [orderId]: false }));
    }
  };

  // Check delivery status for orders with arrange_shipment action
  const checkDeliveryStatus = async (orderId: string) => {
    if (!shopId) return;
    
    try {
      const response = await AxiosInstance.get<DeliveryStatusResponse>(
        `/arrange-shipment/${orderId}/check_delivery_status/`,
        {
          params: { shop_id: shopId }
        }
      );
      
      if (response.data.success) {
        setDeliveryStatuses(prev => ({
          ...prev,
          [orderId]: response.data.data
        }));
      }
    } catch (error: any) {
      // If endpoint doesn't exist or fails, check if order has delivery info
      const order = orders.find(o => o.order_id === orderId);
      if (order?.delivery_info) {
        setDeliveryStatuses(prev => ({
          ...prev,
          [orderId]: order.delivery_info!
        }));
      }
    }
  };

  // Handle arrange shipment navigation
  const handleArrangeShipment = (orderId: string) => {
    if (!shopId) {
      toast.error("Shop ID missing", {
        description: "Please refresh the page and try again."
      });
      return;
    }
    
    navigate(`/arrange-shipment?orderId=${orderId}&shopId=${shopId}`);
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

  // Load actions and delivery status when component mounts or orders change
  useEffect(() => {
    if (shopId && orders.length > 0) {
      // Load actions for first few orders to start
      const ordersToLoad = orders.slice(0, 10);
      ordersToLoad.forEach(order => {
        if (!availableActions[order.order_id]) {
          loadAvailableActions(order.order_id);
        }
        
        // Check delivery status for orders that might have pending offers
        if (hasPendingDeliveryOffer(order) || order.status === 'arrange_shipment') {
          checkDeliveryStatus(order.order_id);
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
    const method = order.delivery_method || order.shipping_method || '';
    return method.toLowerCase().includes('pickup') || method.toLowerCase().includes('store');
  };

  const getStatusBadge = (status: string, order: Order) => {
    const isPickup = isPickupOrder(order);
    const hasPendingOffer = hasPendingDeliveryOffer(order);
    const hasActiveDelivery = order.delivery_info?.status === 'pending';

    let statusKey = (status || 'default').toLowerCase();

    // Override for special cases
    if (hasPendingOffer) statusKey = 'pending_offer';
    else if (hasActiveDelivery && statusKey === 'arrange_shipment') statusKey = 'pending_offer';
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
        case 'pending':
          // Pending tab shows orders with status 'pending_shipment' (which is what backend returns for pending orders)
          filtered = filtered.filter(order => 
            order.status?.toLowerCase() === 'pending_shipment'
          );
          break;
        case 'to_process':
          // To Process tab shows orders with status 'to_ship' (which is what backend returns for processing orders)
          filtered = filtered.filter(order => 
            order.status?.toLowerCase() === 'to_ship'
          );
          break;
        case 'shipped':
          filtered = filtered.filter(order => {
            const s = order.status?.toLowerCase();
            return ['shipped', 'in_transit', 'out_for_delivery', 'picked_up'].includes(s || '');
          });
          break;
        case 'returns':
          filtered = filtered.filter(order => {
            const s = order.status?.toLowerCase();
            return ['refunded', 'cancelled'].includes(s || '');
          });
          break;
        case 'reviews':
          filtered = filtered.filter(order => order.items.some(i => (i as any).reviewed));
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
    pending: orders.filter(o => o.status?.toLowerCase() === 'pending_shipment').length,
    to_process: orders.filter(o => o.status?.toLowerCase() === 'to_ship').length,
    shipped: orders.filter(o => {
      const s = o.status?.toLowerCase();
      return ['shipped', 'in_transit', 'out_for_delivery', 'picked_up'].includes(s || '');
    }).length,
    returns: orders.filter(o => {
      const s = o.status?.toLowerCase();
      return ['refunded', 'cancelled'].includes(s || '');
    }).length,
    reviews: orders.filter(o => o.items.some(i => (i as any).reviewed)).length
  };

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
        // switch user to the To Process tab so Arrange Shipping appears immediately.
        try {
          const backendStatus = String(response.data.data?.status || '').toLowerCase();
          const updatedOrderStatus = String((updated_order as any)?.status || '').toLowerCase();
          const movedToProcessing = backendStatus === 'processing' || updatedOrderStatus === 'to_ship';
          if (actionType === 'confirm' && movedToProcessing) {
            setActiveTab('to_process');
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
    if (!confirm('Are you sure you want to cancel this order?')) return;
    
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

  const getTabCount = (tabId: string) => {
    switch (tabId) {
      case 'all': return counts.all;
      case 'pending': return counts.pending;
      case 'to_process': return counts.to_process;
      case 'shipped': return counts.shipped;
      case 'returns': return counts.returns;
      case 'reviews': return counts.reviews;
      default: return 0;
    }
  };

  const getActionButtons = (order: Order) => {
    const isCancelled = isCancelledOrder(order);
    const isPickup = isPickupOrder(order);
    const actions = availableActions[order.order_id] || [];
    const isLoading = loadingActions[order.order_id];

    // Check if order is pending_shipment (show confirm button)
    const isPending = order.status?.toLowerCase() === 'pending_shipment';
    const canCancel = !isCancelled && !['cancelled', 'completed', 'refunded'].includes(order.status?.toLowerCase() || '');
    // True when a rider is already assigned but delivery is still pending acceptance
    const riderAssignedPending = Boolean(order.delivery_info?.rider_name && String(order.delivery_info?.status || '').toLowerCase() === 'pending');

    // Derived flags: used to hide Arrange Shipping when a rider already accepted pickup
    const dbOrderStatus = String((order as any).order_status || '').toLowerCase();
    const uiStatus = String(order.status || '').toLowerCase();
    const deliveryAccepted = String(order.delivery_info?.status || '').toLowerCase() === 'accepted';
    const riderAcceptedProcessing = deliveryAccepted && (dbOrderStatus === 'processing' || (!dbOrderStatus && uiStatus === 'to_ship'));

    if (isLoading) {
      return (
        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" disabled>
          <Loader2 className="w-3 h-3 animate-spin" />
        </Button>
      );
    }

    // For pending orders, show Confirm + Cancel quick-actions side-by-side
    if (isPending) {
      return (
        <div className="flex gap-1 items-center">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[10px]"
            onClick={async (e) => { 
              e.stopPropagation(); 
              if (!confirm('Confirm this order?')) return; 
              await handleUpdateStatus(order.order_id, 'confirm'); 
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
            onClick={async (e) => { e.stopPropagation(); if (!canCancel) return; await handleCancelOrder(order.order_id); }}
            title={canCancel ? 'Cancel order' : 'Cannot cancel this order'}
          >
            <Ban className="mr-1 w-3 h-3 text-red-600" /> Cancel
          </Button>
        </div>
      );
    }

    // If order is ready for shipping arrangements (backend maps `processing` -> UI `to_ship`),
    // show Arrange Shipping + Cancel quick-actions so seller can proceed immediately.
    const isToShip = String(order.status || '').toLowerCase() === 'to_ship';
    if (isToShip) {
      // hide Arrange Shipping when rider already assigned & pending OR when rider already accepted pickup for a processing order
      const showArrange = !riderAssignedPending && !riderAcceptedProcessing;
      return (
        <div className="flex gap-1 items-center">
          {showArrange && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[10px]"
              onClick={(e) => { e.stopPropagation(); handleArrangeShipment(order.order_id); }}
              title="Arrange shipping"
            >
              <Ship className="mr-1 w-3 h-3 text-blue-600" /> Arrange Shipping
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            className={`h-6 px-2 text-[10px] ${canCancel ? '' : 'opacity-50 cursor-not-allowed text-gray-400'}`}
            disabled={!canCancel}
            onClick={async (e) => { e.stopPropagation(); if (!canCancel) return; await handleCancelOrder(order.order_id); }}
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
                  <Button variant="ghost" size="sm" className="h-8 text-sm" onClick={() => toggleOrderExpansion(order.order_id)}>
                    <Eye className="mr-2 h-4 w-4" /> View Details
                  </Button>

                  {actions.includes('prepare_shipment') && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-sm"
                      onClick={async (e) => {
                        e.stopPropagation();
                        await handlePrepareShipment(order.order_id);
                      }}
                    >
                      <Package2 className="mr-2 h-4 w-4 text-blue-600" /> Prepare Shipment
                    </Button>
                  )}

                  {order.status === 'arrange_shipment' && !riderAssignedPending && !riderAcceptedProcessing && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleArrangeShipment(order.order_id);
                      }}
                    >
                      <Ship className="mr-2 h-4 w-4 text-blue-600" /> Arrange Shipping
                    </Button>
                  )}

                  {canCancel && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-sm"
                      onClick={async (e) => { 
                        e.stopPropagation(); 
                        await handleCancelOrder(order.order_id); 
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
            {actions.includes('prepare_shipment') && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[10px]"
                onClick={async (e) => {
                  e.stopPropagation();
                  await handlePrepareShipment(order.order_id);
                }}
                title="Prepare for shipment"
              >
                <Package2 className="mr-1 w-3 h-3 text-blue-600" /> Prepare
              </Button>
            )}

            {order.status === 'arrange_shipment' && !riderAcceptedProcessing && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[10px]"
                onClick={(e) => {
                  e.stopPropagation();
                  handleArrangeShipment(order.order_id);
                }}
                title="Arrange shipping"
              >
                <Ship className="mr-1 w-3 h-3 text-blue-600" /> Arrange
              </Button>
            )}

            {canCancel && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[10px]"
                onClick={async (e) => { 
                  e.stopPropagation(); 
                  await handleCancelOrder(order.order_id); 
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

  return (
    <SidebarLayout>
      <div className="space-y-3 p-3">
        {/* Header */}
        <div className="mb-2">
          <h1 className="text-lg font-bold">Order Management</h1>
          <p className="text-gray-500 text-xs">Manage customer orders and shipments</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2">
          <Card>
            <CardContent className="p-3">
              <div className="text-xl font-bold">{counts.all}</div>
              <div className="text-xs text-muted-foreground">Total Orders</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="text-xl font-bold text-yellow-600">{counts.pending}</div>
              <div className="text-xs text-muted-foreground">Pending</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="text-xl font-bold text-amber-600">{counts.to_process}</div>
              <div className="text-xs text-muted-foreground">To Process</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="text-xl font-bold text-blue-600">{counts.shipped}</div>
              <div className="text-xs text-muted-foreground">Shipped</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="text-xl font-bold text-green-600">
                {orders.filter(o => o.status === 'completed').length}
              </div>
              <div className="text-xs text-muted-foreground">Completed</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Card>
          <CardContent className="p-3">
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
                         activeTab === 'pending' ? 'No pending orders' :
                         activeTab === 'to_process' ? 'No orders to process' :
                         activeTab === 'shipped' ? 'No shipped orders' :
                         activeTab === 'returns' ? 'No returns' :
                         'No orders with reviews'}
                      </p>
                    </div>
                  ) : (
                    filteredOrders.map((order) => {
                      const isExpanded = expandedOrders.has(order.order_id);
                      const primaryItem = order.items[0];
                      const customerName = formatCustomerName(order.user);

                      // Determine DB/UI processing state (backend returns `order_status` when available)
                      const dbOrderStatus = String((order as any).order_status || '').toLowerCase();
                      const uiStatus = String(order.status || '').toLowerCase();
                      const isDbProcessing = dbOrderStatus === 'processing';
                      const isUiToShip = uiStatus === 'to_ship';
                      const isProcessingState = isDbProcessing || isUiToShip;
                      
                      return (
                        <Card key={order.order_id} className="overflow-hidden border">
                          <CardContent className="p-3">
                            {/* Top Section - Header */}
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1 min-w-0">
                                {/* Status note: show when order is processing and a rider is already assigned but delivery is still pending */}
                                {activeTab === 'to_process' && isProcessingState && order.delivery_info?.status === 'pending' && order.delivery_info?.rider_name && (
                                  <div className="bg-amber-50 p-2 rounded text-[10px] text-amber-700 mb-1">
                                    <div className="font-medium">Waiting for rider to accept the order {order.delivery_info.rider_name}</div>
                                  </div>
                                )}

                                {/* Show pickup note when delivery has been accepted (DB order.status = processing).
                                    Fallback: if `order.order_status` is missing, treat UI `status: 'to_ship'` as processing so note still appears. */}
                                {activeTab === 'to_process' && String(order.delivery_info?.status || '').toLowerCase() === 'accepted' && (
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
                                <button 
                                  onClick={() => toggleOrderExpansion(order.order_id)}
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
                                  <Package className="w-6 h-6 text-gray-300" />
                                </div>
                              ))}
                              {order.items.length > 3 && (
                                <div className="h-12 w-12 rounded-md border bg-gray-50 flex items-center justify-center">
                                  <span className="text-xs text-gray-500">+{order.items.length - 3}</span>
                                </div>
                              )}
                            </div>

                            {/* Expanded Section - Details */}
                            {isExpanded && (
                              <div className="mt-3 pt-3 border-t space-y-2">
                                <div className="text-[10px]">
                                  <div className="font-medium text-gray-700 mb-1">Customer Details</div>
                                  <div className="text-gray-600 space-y-0.5">
                                    <div>Name: {customerName}</div>
                                    <div>Email: {order.user.email}</div>
                                    {order.user.phone && <div>Phone: {order.user.phone}</div>}
                                  </div>
                                </div>
                                
                                <div className="text-[10px]">
                                  <div className="font-medium text-gray-700 mb-1">Delivery Information</div>
                                  <div className="text-gray-600 space-y-0.5">
                                    <div>Address: {order.delivery_address || 'N/A'}</div>
                                    <div>Method: {order.delivery_method || order.shipping_method || 'N/A'}</div>
                                    {order.delivery_info?.rider_name && (
                                      <div>Rider: {order.delivery_info.rider_name}</div>
                                    )}
                                    {order.delivery_info?.tracking_number && (
                                      <div>Tracking: {order.delivery_info.tracking_number}</div>
                                    )}
                                  </div>
                                </div>

                                <div className="text-[10px]">
                                  <div className="font-medium text-gray-700 mb-1">Order Items</div>
                                  <div className="space-y-1">
                                    {order.items.map((item, idx) => (
                                      <div key={idx} className="flex justify-between text-gray-600">
                                        <span className="truncate max-w-[180px]">
                                          {item.cart_item?.product?.name} x{item.quantity}
                                        </span>
                                        <span>{formatCurrency(item.total_amount)}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {order.delivery_info?.status === 'pending_offer' && (
                                  <div className="bg-amber-50 p-2 rounded text-[10px] text-amber-700">
                                    <div className="font-medium">Pending Rider Offer</div>
                                    <div>A rider will soon provide a delivery fee offer.</div>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Bottom Section - Actions */}
                            <div className="flex items-center justify-between pt-2 border-t mt-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleOrderExpansion(order.order_id)}
                                className="h-6 px-2 text-[10px]"
                              >
                                <Eye className="w-2.5 h-2.5 mr-1" />
                                {isExpanded ? 'Show Less' : 'View Details'}
                              </Button>
                              
                              <div className="flex gap-1">
                                {getActionButtons(order)}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </div>


              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </SidebarLayout>
  );
}