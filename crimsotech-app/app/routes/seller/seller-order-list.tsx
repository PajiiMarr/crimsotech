import type { Route } from './+types/seller-order-list';
import SidebarLayout from '~/components/layouts/seller-sidebar'
import { UserProvider } from '~/components/providers/user-role-provider';
import { 
  Card, 
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { Input } from '~/components/ui/input';
import { useState, useEffect } from 'react';
import { Link } from 'react-router';
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
  CheckSquare,
  List,
  Ship,
  Loader2,
  RotateCcw,
  Printer,
  ChevronDown,
  ChevronUp,
  MapPin,
  CreditCard,
  Phone,
  MoreHorizontal,
  Edit,
  Trash2,
  Store,
  Home,
  MapPin as MapPinIcon,
  Ban
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { DataTable } from '~/components/ui/data-table';
import { type ColumnDef } from '@tanstack/react-table';
import AxiosInstance from '~/components/axios/Axios';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '~/components/ui/dropdown-menu';
import { DropdownMenuTrigger } from '@radix-ui/react-dropdown-menu';
import { OrderActions } from '~/components/shop/order-actions';
import { useIsMobile } from '~/hooks/use-mobile';
import { Sheet, SheetContent, SheetTrigger } from '~/components/ui/sheet';

export function meta(): Route.MetaDescriptors {
  return [
    {
      title: "Seller Orders",
    },
  ];
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

// Add loader function to get session data and fetch orders
export async function loader({ request, context }: Route.LoaderArgs) {
  const { registrationMiddleware } = await import("~/middleware/registration.server");
  await registrationMiddleware({ request, context, params: {}, unstable_pattern: undefined } as any);
  const { requireRole } = await import("~/middleware/role-require.server");
  const { fetchUserRole } = await import("~/middleware/role.server");
  const { userContext } = await import("~/contexts/user-role");

  let user = (context as any).get(userContext);
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

const EmptyState = ({ message = "No orders" }: { message?: string }) => (
  <div className="text-center py-6">
    <ShoppingCart className="mx-auto h-8 w-8 text-gray-300 mb-2" />
    <p className="text-gray-500 text-sm">{message}</p>
  </div>
);

export default function SellerOrderList({ loaderData }: Route.ComponentProps) {
  const { userId, shopId, orders: initialOrders } = loaderData;
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<string>('all');
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [availableActions, setAvailableActions] = useState<Record<string, string[]>>({});
  const [loadingActions, setLoadingActions] = useState<Record<string, boolean>>({});

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
      }
    } catch (error: any) {
      console.error('Error fetching orders:', error);
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
        setAvailableActions(prev => ({
          ...prev,
          [orderId]: response.data.data.available_actions
        }));
      }
    } catch (error: any) {
      console.error('Error loading available actions:', error);
      // Fallback to empty array if API fails
      setAvailableActions(prev => ({
        ...prev,
        [orderId]: []
      }));
    } finally {
      setLoadingActions(prev => ({ ...prev, [orderId]: false }));
    }
  };

  // Load actions when component mounts or orders change
  useEffect(() => {
    if (shopId && orders.length > 0) {
      // Load actions for first few orders to start
      const ordersToLoad = orders.slice(0, 10); // Load for first 10 orders
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
    const method = order.delivery_method || order.shipping_method || '';
    return method.toLowerCase().includes('pickup') || method.toLowerCase().includes('store');
  };

  const getStatusColor = (status: string) => {
    switch(status?.toLowerCase()) {
      case 'completed': return '#10b981';
      case 'pending_shipment': return '#f59e0b';
      case 'to_ship': return '#f97316';
      case 'ready_for_pickup': return '#3b82f6';
      case 'awaiting_pickup': return '#8b5cf6';
      case 'picked_up': return '#10b981';
      case 'shipped': return '#3b82f6';
      case 'in_transit': return '#3b82f6';
      case 'out_for_delivery': return '#8b5cf6';
      case 'cancelled': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch(status?.toLowerCase()) {
      case 'completed': return <CheckCircle className="w-3 h-3" />;
      case 'pending_shipment': return <Clock className="w-3 h-3" />;
      case 'to_ship': return <Package2 className="w-3 h-3" />;
      case 'ready_for_pickup': return <Store className="w-3 h-3" />;
      case 'awaiting_pickup': return <Clock className="w-3 h-3" />;
      case 'picked_up': return <CheckCircle className="w-3 h-3" />;
      case 'shipped': return <Ship className="w-3 h-3" />;
      case 'in_transit': return <Truck className="w-3 h-3" />;
      case 'out_for_delivery': return <Truck className="w-3 h-3" />;
      case 'cancelled': return <Ban className="w-3 h-3" />;
      default: return <Clock className="w-3 h-3" />;
    }
  };

  const getStatusLabel = (status: string, order: Order) => {
    const isPickup = isPickupOrder(order);
    const isCancelled = isCancelledOrder(order);
    
    if (isCancelled) return 'Cancelled';
    
    switch(status?.toLowerCase()) {
      case 'pending_shipment': 
        return isPickup ? 'To Prepare' : 'Pending Shipment';
      case 'to_ship': 
        return isPickup ? 'Ready for Pickup' : 'To Ship';
      case 'ready_for_pickup': 
        return 'Ready for Pickup';
      case 'awaiting_pickup': 
        return 'Awaiting Pickup';
      case 'picked_up': 
        return 'Picked Up';
      case 'shipped': 
        return 'Shipped';
      case 'in_transit': 
        return 'In Transit';
      case 'out_for_delivery': 
        return 'Out for Delivery';
      case 'completed': 
        return isPickup ? 'Picked Up' : 'Completed';
      case 'cancelled': 
        return 'Cancelled';
      default: return status?.replace(/_/g, ' ') || 'Unknown';
    }
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

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '';
    }
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
      filtered = filtered.filter(order => order.status === activeTab);
    }

    return filtered;
  };

  const filteredOrders = getFilteredOrders();

  const counts = {
    all: orders.length,
    pending_shipment: orders.filter(o => o.status === 'pending_shipment').length,
    to_ship: orders.filter(o => o.status === 'to_ship').length,
    ready_for_pickup: orders.filter(o => o.status === 'ready_for_pickup').length,
    awaiting_pickup: orders.filter(o => o.status === 'awaiting_pickup').length,
    shipped: orders.filter(o => o.status === 'shipped').length,
    in_transit: orders.filter(o => o.status === 'in_transit').length,
    out_for_delivery: orders.filter(o => o.status === 'out_for_delivery').length,
    completed: orders.filter(o => o.status === 'completed').length,
    cancelled: orders.filter(o => o.status === 'cancelled').length
  };

  const getPaymentIcon = (method: string | null) => {
    if (!method) return <CreditCard className="w-3 h-3" />;
    switch(method.toLowerCase()) {
      case 'credit card':
      case 'debit card':
        return <CreditCard className="w-3 h-3" />;
      case 'gcash':
        return <Phone className="w-3 h-3" />;
      case 'bank transfer':
        return <CreditCard className="w-3 h-3" />;
      case 'cash':
        return <CreditCard className="w-3 h-3" />;
      default:
        return <CreditCard className="w-3 h-3" />;
    }
  };

  const handleUpdateStatus = async (orderId: string, actionType: string) => {
    try {
      const response = await AxiosInstance.patch(`/seller-order-list/${orderId}/update_status/`, {
        action_type: actionType
      }, {
        params: { shop_id: shopId }
      });
      
      if (response.data.success) {
        // Refresh orders to get updated data
        await refreshOrders();
        // Refresh available actions for this order
        await loadAvailableActions(orderId);
        alert(`Order ${actionType} successfully`);
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      alert('Failed to update order status');
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
        // Refresh available actions for this order
        await loadAvailableActions(orderId);
        alert('Order cancelled successfully');
      }
    } catch (error) {
      console.error('Error cancelling order:', error);
      alert('Failed to cancel order');
    }
  };

  // Define columns for DataTable
  const columns: ColumnDef<Order>[] = [
    {
      accessorKey: "order_id",
      header: "Order ID",
      cell: ({ row }) => {
        const order = row.original;
        return (
          <div className="font-medium">{order.order_id}</div>
        );
      },
    },
    {
      accessorKey: "customer",
      header: "Customer",
      cell: ({ row }) => {
        const order = row.original;
        const customerName = formatCustomerName(order.user);
        return (
          <div className="flex items-center gap-2">
            <User className="w-3.5 h-3.5 text-gray-500" />
            <span className="text-sm">{customerName}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => {
        const order = row.original;
        const isPickup = isPickupOrder(order);
        const isCancelled = isCancelledOrder(order);
        
        if (isCancelled) {
          return (
            <Badge 
              variant="outline" 
              className="text-xs h-5 px-2 py-0 flex items-center gap-1 border-red-200 text-red-600"
            >
              <Ban className="w-3 h-3" />
              Cancelled
            </Badge>
          );
        }
        
        return (
          <Badge 
            variant="outline" 
            className="text-xs h-5 px-2 py-0 flex items-center gap-1"
          >
            {isPickup ? (
              <>
                <Store className="w-3 h-3" />
                Pickup
              </>
            ) : (
              <>
                <Truck className="w-3 h-3" />
                Delivery
              </>
            )}
          </Badge>
        );
      },
    },
    {
      accessorKey: "items",
      header: "Items",
      cell: ({ row }) => {
        const order = row.original;
        const primaryItem = order.items[0];
        return (
          <div className="flex items-center gap-2">
            <Package className="w-3 h-3" />
            <span className="text-sm truncate">
              {primaryItem?.cart_item?.product?.name}
              {order.items.length > 1 && ` +${order.items.length - 1} more`}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "total_amount",
      header: "Total Amount",
      cell: ({ row }) => {
        return (
          <div className="font-medium text-sm">
            <PhilippinePeso className="inline w-3 h-3 mr-0.5" />
            {row.original.total_amount.toLocaleString()}
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const order = row.original;
        const statusColor = getStatusColor(order.status);
        return (
          <Badge 
            className="text-xs h-5 px-2 py-0 flex items-center gap-1"
            style={{ 
              backgroundColor: `${statusColor}15`, 
              color: statusColor 
            }}
          >
            {getStatusIcon(order.status)}
            {getStatusLabel(order.status, order)}
          </Badge>
        );
      },
    },
    {
      accessorKey: "created_at",
      header: "Date",
      cell: ({ row }) => {
        return formatDate(row.original.created_at);
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const order = row.original;
        const isCancelled = isCancelledOrder(order);
        const isPickup = isPickupOrder(order);
        const isMobile = useIsMobile();
        const actions = availableActions[order.order_id] || [];
        const isLoading = loadingActions[order.order_id];
        
        return (
          <>
            {isMobile ? (
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="h-auto max-h-[80vh] overflow-y-auto">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Order Actions</h3>
                    <OrderActions
                      order={order}
                      isCancelled={isCancelled}
                      isPickup={isPickup}
                      availableActions={actions}
                      isLoadingActions={isLoading}
                      onUpdateStatus={handleUpdateStatus}
                      onCancelOrder={handleCancelOrder}
                      onViewDetails={() => toggleOrderExpansion(order.order_id)}
                      onRefreshActions={() => loadAvailableActions(order.order_id)}
                      isMobile={true}
                    />
                  </div>
                </SheetContent>
              </Sheet>
            ) : (
              <OrderActions
                order={order}
                isCancelled={isCancelled}
                isPickup={isPickup}
                availableActions={actions}
                isLoadingActions={isLoading}
                onUpdateStatus={handleUpdateStatus}
                onCancelOrder={handleCancelOrder}
                onViewDetails={() => toggleOrderExpansion(order.order_id)}
                onRefreshActions={() => loadAvailableActions(order.order_id)}
                isMobile={false}
              />
            )}
          </>
        );
      },
    }
  ];

  return (
    <SidebarLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Order Management</h1>
            <p className="text-muted-foreground">
              Manage customer orders and shipments
            </p>
          </div>
          <Button
            onClick={refreshOrders}
            disabled={loading}
            variant="outline"
            size="sm"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RotateCcw className="h-4 w-4 mr-2" />
            )}
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{counts.all}</div>
              <div className="text-sm text-muted-foreground">Total Orders</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-orange-600">
                {counts.pending_shipment + counts.to_ship}
              </div>
              <div className="text-sm text-muted-foreground">To Process</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">
                {counts.shipped + counts.in_transit + counts.out_for_delivery + 
                 counts.ready_for_pickup + counts.awaiting_pickup}
              </div>
              <div className="text-sm text-muted-foreground">In Progress</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-red-600">
                {counts.cancelled}
              </div>
              <div className="text-sm text-muted-foreground">Cancelled</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Card>
          <CardHeader>
            <CardTitle>Orders</CardTitle>
            <CardDescription>
              {filteredOrders.length} order{filteredOrders.length !== 1 ? 's' : ''} found
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!userId ? (
              <div className="text-center py-8 text-muted-foreground">
                <div className="mb-4">User authentication required</div>
                <Button asChild>
                  <Link to="/login">Please log in</Link>
                </Button>
              </div>
            ) : !shopId ? (
              <div className="text-center py-8 text-muted-foreground">
                <div className="mb-4">Shop not found</div>
                <Button asChild>
                  <Link to="/seller/create-shop">Create a shop first</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search orders by ID, customer, or product..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid grid-cols-4 md:grid-cols-8 lg:w-auto">
                    <TabsTrigger value="all" className="flex items-center gap-2">
                      <List className="w-3 h-3" />
                      All
                      {counts.all > 0 && (
                        <Badge variant="secondary" className="ml-1 h-4 px-1 text-xs">
                          {counts.all}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="pending_shipment" className="flex items-center gap-2">
                      <Clock className="w-3 h-3" />
                      Pending
                      {counts.pending_shipment > 0 && (
                        <Badge variant="secondary" className="ml-1 h-4 px-1 text-xs">
                          {counts.pending_shipment}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="to_ship" className="flex items-center gap-2">
                      <Package2 className="w-3 h-3" />
                      To Process
                      {counts.to_ship > 0 && (
                        <Badge variant="secondary" className="ml-1 h-4 px-1 text-xs">
                          {counts.to_ship}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="ready_for_pickup" className="flex items-center gap-2">
                      <Store className="w-3 h-3" />
                      Ready
                      {counts.ready_for_pickup > 0 && (
                        <Badge variant="secondary" className="ml-1 h-4 px-1 text-xs">
                          {counts.ready_for_pickup}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="shipped" className="flex items-center gap-2">
                      <Ship className="w-3 h-3" />
                      Shipped
                      {counts.shipped > 0 && (
                        <Badge variant="secondary" className="ml-1 h-4 px-1 text-xs">
                          {counts.shipped}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="in_transit" className="flex items-center gap-2">
                      <Truck className="w-3 h-3" />
                      In Transit
                      {counts.in_transit > 0 && (
                        <Badge variant="secondary" className="ml-1 h-4 px-1 text-xs">
                          {counts.in_transit}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="completed" className="flex items-center gap-2">
                      <CheckCircle className="w-3 h-3" />
                      Completed
                      {counts.completed > 0 && (
                        <Badge variant="secondary" className="ml-1 h-4 px-1 text-xs">
                          {counts.completed}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="cancelled" className="flex items-center gap-2">
                      <Ban className="w-3 h-3" />
                      Cancelled
                      {counts.cancelled > 0 && (
                        <Badge variant="secondary" className="ml-1 h-4 px-1 text-xs">
                          {counts.cancelled}
                        </Badge>
                      )}
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value={activeTab} className="mt-4">
                    {/* DataTable */}
                    <DataTable
                      columns={columns}
                      data={filteredOrders}
                      searchConfig={{
                        column: "order_id",
                        placeholder: "Search within filtered orders..."
                      }}
                      filterConfig={{
                        status: {
                          options: ["pending_shipment", "to_ship", "ready_for_pickup", "shipped", "in_transit", "out_for_delivery", "completed", "cancelled"],
                          placeholder: "Filter by status"
                        }
                      }}
                      defaultSorting={[
                        {
                          id: "created_at",
                          desc: true,
                        },
                      ]}
                    />
                  </TabsContent>
                </Tabs>

                {/* Expanded Order Details */}
                <div className="space-y-3 mt-6">
                  {filteredOrders.map((order) => {
                    if (!expandedOrders.has(order.order_id)) return null;
                    
                    const customerName = formatCustomerName(order.user);
                    const statusColor = getStatusColor(order.status);
                    const isPickup = isPickupOrder(order);
                    const isCancelled = isCancelledOrder(order);
                    
                    return (
                      <Card key={order.order_id} className="overflow-hidden border">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <h3 className="font-semibold">Order Details</h3>
                              <p className="text-sm text-muted-foreground">{order.order_id}</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleOrderExpansion(order.order_id)}
                            >
                              <ChevronUp className="w-4 h-4" />
                            </Button>
                          </div>

                          {/* Order Type Badge */}
                          <div className="mb-4">
                            <Badge 
                              variant={isCancelled ? "destructive" : (isPickup ? "default" : "secondary")}
                              className="flex items-center gap-1 w-fit"
                            >
                              {isCancelled ? (
                                <>
                                  <Ban className="w-3 h-3" />
                                  Cancelled Order
                                </>
                              ) : isPickup ? (
                                <>
                                  <Store className="w-3 h-3" />
                                  Pickup Order
                                </>
                              ) : (
                                <>
                                  <Truck className="w-3 h-3" />
                                  Delivery Order
                                </>
                              )}
                            </Badge>
                          </div>

                          {/* Customer Information */}
                          <div className="mb-4">
                            <h4 className="text-sm font-medium mb-2">Customer Information</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                              <div>
                                <p className="font-medium">{customerName}</p>
                                <p className="text-muted-foreground">{order.user.email}</p>
                                {order.user.phone && (
                                  <p className="text-muted-foreground">{order.user.phone}</p>
                                )}
                              </div>
                              <div>
                                {!isCancelled && (
                                  <>
                                    <p className="font-medium">{isPickup ? 'Pickup Location' : 'Delivery Address'}</p>
                                    <div className="flex items-start gap-2">
                                      {isPickup ? (
                                        <Store className="w-4 h-4 text-gray-500 mt-0.5" />
                                      ) : (
                                        <MapPinIcon className="w-4 h-4 text-gray-500 mt-0.5" />
                                      )}
                                      <p className="text-muted-foreground">
                                        {order.delivery_address || 'No address provided'}
                                      </p>
                                    </div>
                                    {order.delivery_method && (
                                      <p className="text-sm text-muted-foreground mt-1">
                                        Method: {order.delivery_method}
                                      </p>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Order Items */}
                          <div className="mb-4">
                            <h4 className="text-sm font-medium mb-2">Order Items</h4>
                            <div className="space-y-3">
                              {order.items.map((item) => (
                                <div key={item.id} className="flex items-center justify-between border-b pb-3">
                                  <div className="flex-1">
                                    <p className="font-medium">{item.cart_item.product.name}</p>
                                    {item.cart_item.product.variant && (
                                      <p className="text-sm text-muted-foreground">
                                        Variant: {item.cart_item.product.variant}
                                      </p>
                                    )}
                                    <p className="text-sm text-muted-foreground">
                                      Quantity: {item.quantity} × 
                                      <span className="ml-1">
                                        <PhilippinePeso className="inline w-3 h-3 mr-0.5" />
                                        {item.cart_item.product.price.toLocaleString()}
                                      </span>
                                    </p>
                                  </div>
                                  <div className="font-medium">
                                    <PhilippinePeso className="inline w-3 h-3 mr-0.5" />
                                    {item.total_amount.toLocaleString()}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Order Summary */}
                          <div className="border-t pt-3">
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="text-sm text-muted-foreground">
                                  Order Date: {formatDateTime(order.created_at)}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  Payment Method: {order.payment_method || 'Not specified'}
                                </p>
                                {!isCancelled && (
                                  <p className="text-sm text-muted-foreground">
                                    Order Type: {isPickup ? 'Pickup' : 'Delivery'}
                                  </p>
                                )}
                              </div>
                              <div className="text-right">
                                <p className="text-sm text-muted-foreground">Total Amount</p>
                                <p className="text-2xl font-bold">
                                  <PhilippinePeso className="inline w-4 h-4 mr-1" />
                                  {order.total_amount.toLocaleString()}
                                </p>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </SidebarLayout>
  );
}