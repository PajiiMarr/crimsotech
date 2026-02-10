import { toast } from 'sonner';
import type { Route } from './+types/orders';
import SidebarLayout from '~/components/layouts/sidebar'
import { UserProvider } from '~/components/providers/user-role-provider';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent, 
  CardDescription 
} from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { Skeleton } from '~/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';
import { 
  ShoppingCart,
  TrendingUp,
  Clock,
  ArrowUpDown,
  User,
  Package,
  Calendar,
  CreditCard,
  CheckCircle,
  XCircle,
  AlertCircle,
  Store,
  PhilippinePeso,
  Check,
  X,
  Eye,
  MoreHorizontal,
  ExternalLink,
  Truck,
  CheckCheck,
  RotateCcw,
  AlertTriangle,
  RefreshCw,
  PlayCircle,
  PauseCircle,
  Ban
} from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '~/components/ui/data-table';
import AxiosInstance from '~/components/axios/Axios';
import DateRangeFilter from '~/components/ui/date-range-filter';
import { useState, useEffect } from 'react';
import { useLoaderData, useNavigate, useSearchParams } from 'react-router';
import { Link } from 'react-router';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select"

export function meta(): Route.MetaDescriptors {
  return [
    {
      title: "Orders | Admin",
    },
  ];
}

// Interface that matches Django AdminOrders response
interface OrderItem {
  id: string;
  cart_item: {
    id: string;
    product: {
      id: string;
      name: string;
      price: number;
      shop: {
        id: string;
        name: string;
      };
    };
    user: {
      id: string;
      username: string;
      email: string;
      first_name: string;
      last_name: string;
    };
  };
  voucher?: {
    id: string;
    name: string;
    code: string;
    value: number;
  };
  total_amount: number;
  status: string;
  created_at: string;
  is_removed?: boolean;
}

interface Order {
  order_id: string;
  user: {
    id: string;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
  };
  status: string;
  total_amount: number;
  payment_method: string;
  delivery_address: string;
  created_at: string;
  updated_at: string;
  items: OrderItem[];
  is_removed?: boolean;
}

interface LoaderData {
  user: any;
  orderMetrics: {
    total_orders: number;
    pending_orders: number;
    completed_orders: number;
    cancelled_orders: number;
    total_revenue: number;
    today_orders: number;
    monthly_orders: number;
    avg_order_value: number;
    success_rate: number;
    growth_metrics?: {
      order_growth?: number;
      revenue_growth?: number;
      previous_period_total?: number;
      previous_period_revenue?: number;
      period_days?: number;
    };
  };
  orders: Order[];
  dateRange: {
    start: string;
    end: string;
    rangeType: string;
  };
}

// Helper function to normalize order status
const normalizeOrderStatus = (status: string): string => {
  if (!status) return 'Unknown';
  const lowerStatus = status.toLowerCase();
  
  switch (lowerStatus) {
    case 'completed':
    case 'delivered':
    case 'paid':
      return 'Completed';
    case 'pending':
    case 'processing':
      return 'Pending';
    case 'cancelled':
      return 'Cancelled';
    case 'failed':
    case 'refunded':
      return 'Failed';
    case 'shipped':
    case 'in_transit':
      return 'Shipped';
    case 'awaiting_payment':
      return 'Awaiting Payment';
    case 'on_hold':
      return 'On Hold';
    case 'removed':
    case 'is_removed':
      return 'Removed';
    default:
      return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  }
};

// Helper function to get order status badge styling
const getOrderStatusConfig = (status: string) => {
  const normalizedStatus = normalizeOrderStatus(status);
  
  switch (normalizedStatus) {
    case 'Completed':
    case 'Delivered':
      return {
        variant: 'default' as const,
        className: 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100',
        icon: CheckCheck,
        iconClassName: 'text-green-600'
      };
    case 'Pending':
    case 'Processing':
      return {
        variant: 'secondary' as const,
        className: 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100',
        icon: Clock,
        iconClassName: 'text-yellow-600'
      };
    case 'Shipped':
    case 'In Transit':
      return {
        variant: 'default' as const,
        className: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
        icon: Truck,
        iconClassName: 'text-blue-600'
      };
    case 'Cancelled':
      return {
        variant: 'destructive' as const,
        className: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100',
        icon: XCircle,
        iconClassName: 'text-red-600'
      };
    case 'Failed':
    case 'Refunded':
      return {
        variant: 'destructive' as const,
        className: 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100',
        icon: AlertTriangle,
        iconClassName: 'text-rose-600'
      };
    case 'Awaiting Payment':
      return {
        variant: 'secondary' as const,
        className: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100',
        icon: CreditCard,
        iconClassName: 'text-purple-600'
      };
    case 'On Hold':
      return {
        variant: 'secondary' as const,
        className: 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100',
        icon: PauseCircle,
        iconClassName: 'text-gray-600'
      };
    case 'Removed':
      return {
        variant: 'destructive' as const,
        className: 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100',
        icon: Ban,
        iconClassName: 'text-rose-600'
      };
    default:
      return {
        variant: 'secondary' as const,
        className: 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100',
        icon: AlertCircle,
        iconClassName: 'text-gray-600'
      };
  }
};

// Order Status Badge Component
function OrderStatusBadge({ status }: { status: string }) {
  const config = getOrderStatusConfig(status);
  const Icon = config.icon;
  
  return (
    <Badge 
      variant={config.variant} 
      className={`flex items-center gap-1.5 ${config.className}`}
    >
      <Icon className={`w-3 h-3 ${config.iconClassName}`} />
      {normalizeOrderStatus(status)}
    </Badge>
  );
}

export async function loader({ request, context }: Route.LoaderArgs): Promise<LoaderData> {
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

  // Parse URL search params for date range
  const url = new URL(request.url);
  const startParam = url.searchParams.get('start');
  const endParam = url.searchParams.get('end');
  const rangeTypeParam = url.searchParams.get('rangeType');

  // Set default date range (last 7 days)
  const defaultStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const defaultEnd = new Date();
  
  const startDate = startParam ? new Date(startParam) : defaultStart;
  const endDate = endParam ? new Date(endParam) : defaultEnd;
  const rangeType = rangeTypeParam || 'weekly';

  // Validate dates
  const validStart = !isNaN(startDate.getTime()) ? startDate : defaultStart;
  const validEnd = !isNaN(endDate.getTime()) ? endDate : defaultEnd;

  // Initialize empty data structures
  let orderMetrics = {
    total_orders: 0,
    pending_orders: 0,
    completed_orders: 0,
    cancelled_orders: 0,
    total_revenue: 0,
    today_orders: 0,
    monthly_orders: 0,
    avg_order_value: 0,
    success_rate: 0,
    growth_metrics: {}
  };

  let ordersList: Order[] = [];

  try {
    // Build query parameters
    const params = new URLSearchParams();
    params.append('start_date', validStart.toISOString().split('T')[0]);
    params.append('end_date', validEnd.toISOString().split('T')[0]);
    params.append('range_type', rangeType);

    // Fetch real data from API with date range parameters
    const response = await AxiosInstance.get(`/admin-orders/get_metrics/?${params.toString()}`, {
      headers: {
        "X-User-Id": session.get("userId")
      }
    });

    if (response.data.success) {
      orderMetrics = response.data.metrics || orderMetrics;
      ordersList = response.data.orders || [];
      
      // Normalize order statuses for consistency
      ordersList = ordersList.map(order => ({
        ...order,
        status: normalizeOrderStatus(order.status),
        items: order.items.map(item => ({
          ...item,
          status: normalizeOrderStatus(item.status)
        }))
      }));
    }
  } catch (error) {
    console.log('API fetch failed, using empty data fallback:', error);
    // Empty fallback - no mock data
  }

  return { 
    user, 
    orderMetrics,
    orders: ordersList,
    dateRange: {
      start: validStart.toISOString(),
      end: validEnd.toISOString(),
      rangeType
    }
  };
}

const COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6'];
const PAYMENT_COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b'];

// Empty state components
const EmptyChart = ({ message }: { message: string }) => (
  <div className="flex items-center justify-center h-64">
    <div className="text-center text-muted-foreground">
      <p>{message}</p>
    </div>
  </div>
);

const EmptyTable = () => (
  <div className="flex items-center justify-center h-32">
    <div className="text-center text-muted-foreground">
      <p>No orders found</p>
    </div>
  </div>
);

export default function Checkouts() {
  const loaderData = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, orderMetrics, orders, dateRange } = loaderData;

  // State management for date range
  const [currentDateRange, setCurrentDateRange] = useState({
    start: new Date(dateRange.start),
    end: new Date(dateRange.end),
    rangeType: dateRange.rangeType as 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'
  });

  const [isLoading, setIsLoading] = useState(false);

  // Handle date range change - update URL search params
  const handleDateRangeChange = (range: { start: Date; end: Date; rangeType: string }) => {
    setIsLoading(true);
    
    // Update URL search params
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set('start', range.start.toISOString());
    newSearchParams.set('end', range.end.toISOString());
    newSearchParams.set('rangeType', range.rangeType);
    
    // Navigate to update the URL, which will trigger a new loader call
    navigate(`?${newSearchParams.toString()}`, { replace: true });
    
    setCurrentDateRange({
      start: range.start,
      end: range.end,
      rangeType: range.rangeType as 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'
    });
  };

  // Function to update order status
  const updateOrderStatus = async (orderId: string, itemId: string, actionType: string, reason?: string) => {
    setIsLoading(true);
    try {
      const payload = {
        order_id: orderId,
        order_item_id: itemId,
        action_type: actionType,
        user_id: user?.id,
        ...(reason && { reason })
      };

      const response = await AxiosInstance.put('/admin-orders/update_order_status/', payload, {
        headers: {
          "X-User-Id": user?.id || ''
        }
      });

      if (response.data.success || response.data.message) {
        toast.success(response.data.message || 'Order status updated successfully');
        
        // Refresh the page to get updated data
        window.location.reload();
        return true;
      } else {
        toast.error(response.data.error || 'Failed to update order status');
        return false;
      }
    } catch (error: any) {
      console.error('Error updating order status:', error);
      
      if (error.response?.data?.error) {
        toast.error(error.response.data.error);
      } else if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error('Failed to update order status');
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Reset loading state when loader data changes
  useEffect(() => {
    setIsLoading(false);
  }, [loaderData]);

  if (!loaderData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div>Loading orders...</div>
      </div>
    );
  }

  const safeOrders = orders || [];
  const safeMetrics = orderMetrics || {
    total_orders: 0,
    pending_orders: 0,
    completed_orders: 0,
    cancelled_orders: 0,
    total_revenue: 0,
    today_orders: 0,
    monthly_orders: 0,
    avg_order_value: 0,
    success_rate: 0,
  };

  // Format percentage for display
  const formatPercentage = (value: number) => {
    if (value === undefined || value === null) return 'N/A';
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  // Get growth metrics
  const growthMetrics = safeMetrics.growth_metrics || {};

  // Flatten orders into individual items for the table
  const orderItems = safeOrders.flatMap(order => 
    order.items.map(item => ({
      ...item,
      order_id: order.order_id,
      order_user: order.user,
      payment_method: order.payment_method,
      delivery_address: order.delivery_address,
      order_created_at: order.created_at,
      order_status: order.status,
      order_is_removed: order.is_removed
    }))
  );

  const hasOrders = safeOrders.length > 0;
  const hasOrderItems = orderItems.length > 0;

  // Transform data to include shopName for filtering
  const transformedOrderItems = orderItems.map(item => ({
    ...item,
    shopName: item.cart_item?.product?.shop?.name || 'Unknown Shop',
    customerName: `${item.cart_item?.user?.first_name || ''} ${item.cart_item?.user?.last_name || ''}`.trim() || 'Unknown Customer'
  }));

  const orderFilterConfig = {
    status: {
      options: [...new Set(transformedOrderItems.map(item => item.status))],
      placeholder: 'Status'
    },
    shopName: {
      options: [...new Set(transformedOrderItems.map(item => item.shopName))].filter(Boolean),
      placeholder: 'Shop'
    },
    order_status: {
      options: [...new Set(transformedOrderItems.map(item => item.order_status))],
      placeholder: 'Order Status'
    }
  };

  // MetricCardSkeleton for loading state
  const MetricCardSkeleton = () => (
    <Card>
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-4 w-20 mb-2" />
            <Skeleton className="h-8 w-16 mt-1" />
            <Skeleton className="h-3 w-24 mt-2" />
          </div>
          <Skeleton className="w-10 h-10 sm:w-12 sm:h-12 rounded-full" />
        </div>
      </CardContent>
    </Card>
  );

  return (
    <UserProvider user={user}>
      <SidebarLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Orders</h1>
            </div>
          </div>

          {/* Date Range Filter */}
          <DateRangeFilter 
            onDateRangeChange={handleDateRangeChange}
            isLoading={isLoading}
            // initialRange={currentDateRange}
          />

          {/* Key Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Orders</p>
                        <p className="text-xl sm:text-2xl font-bold mt-1">{safeMetrics.total_orders}</p>
                        {!isLoading && growthMetrics.order_growth !== undefined && (
                          <div className={`flex items-center gap-1 mt-2 text-sm ${
                            growthMetrics.order_growth >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            <span>{formatPercentage(growthMetrics.order_growth)}</span>
                            <span className="text-xs text-muted-foreground">
                              vs previous {growthMetrics.period_days || 7} days
                            </span>
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">{safeMetrics.today_orders} today</p>
                      </div>
                      <div className="p-2 sm:p-3 bg-blue-100 rounded-full">
                        <ShoppingCart className="w-4 h-4 sm:w-6 sm:h-6 text-blue-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Revenue</p>
                        <p className="text-xl sm:text-2xl font-bold mt-1">₱{safeMetrics.total_revenue.toLocaleString()}</p>
                        {!isLoading && growthMetrics.revenue_growth !== undefined && (
                          <div className={`flex items-center gap-1 mt-2 text-sm ${
                            growthMetrics.revenue_growth >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            <span>{formatPercentage(growthMetrics.revenue_growth)}</span>
                            <span className="text-xs text-muted-foreground">
                              vs previous {growthMetrics.period_days || 7} days
                            </span>
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">From all orders</p>
                      </div>
                      <div className="p-2 sm:p-3 bg-green-100 rounded-full">
                        <PhilippinePeso className="w-4 h-4 sm:w-6 sm:h-6 text-green-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Success Rate</p>
                        <p className="text-xl sm:text-2xl font-bold mt-1">{safeMetrics.success_rate}%</p>
                        <p className="text-xs text-muted-foreground mt-2">Order completion</p>
                      </div>
                      <div className="p-2 sm:p-3 bg-purple-100 rounded-full">
                        <TrendingUp className="w-4 h-4 sm:w-6 sm:h-6 text-purple-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Avg. Order Value</p>
                        <p className="text-xl sm:text-2xl font-bold mt-1">₱{safeMetrics.avg_order_value}</p>
                        <p className="text-xs text-muted-foreground mt-2">Per order</p>
                      </div>
                      <div className="p-2 sm:p-3 bg-yellow-100 rounded-full">
                        <CreditCard className="w-4 h-4 sm:w-6 sm:h-6 text-yellow-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          {/* Status Overview Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {isLoading ? (
              <>
                <Card>
                  <CardContent className="p-4">
                    <Skeleton className="h-12 w-full" />
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <Skeleton className="h-12 w-full" />
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <Skeleton className="h-12 w-full" />
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <Skeleton className="h-12 w-full" />
                  </CardContent>
                </Card>
              </>
            ) : (
              <>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Completed</p>
                        <p className="text-lg font-bold mt-1 text-green-600">{safeMetrics.completed_orders}</p>
                      </div>
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Pending</p>
                        <p className="text-lg font-bold mt-1 text-yellow-600">{safeMetrics.pending_orders}</p>
                      </div>
                      <Clock className="w-4 h-4 text-yellow-600" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Cancelled</p>
                        <p className="text-lg font-bold mt-1 text-red-600">{safeMetrics.cancelled_orders}</p>
                      </div>
                      <XCircle className="w-4 h-4 text-red-600" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">This Month</p>
                        <p className="text-lg font-bold mt-1 text-blue-600">{safeMetrics.monthly_orders}</p>
                      </div>
                      <Calendar className="w-4 h-4 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          {/* Orders Table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg sm:text-xl">All Order Items</CardTitle>
              <CardDescription>
                {isLoading ? 'Loading orders...' : `Showing ${transformedOrderItems.length} order items`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-10 w-full" />
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : hasOrderItems ? (
                <div className="rounded-md">
                  <DataTable 
                    columns={columns} 
                    data={transformedOrderItems}
                    filterConfig={orderFilterConfig}
                    searchConfig={{
                      column: "customerName",
                      placeholder: "Search by customer name..."
                    }}
                    isLoading={isLoading}
                  />
                </div>
              ) : (
                <EmptyTable />
              )}
            </CardContent>
          </Card>
        </div>
      </SidebarLayout>
    </UserProvider>
  );
}

const columns: ColumnDef<any>[] = [
  {
    accessorKey: "order_id",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="text-xs sm:text-sm"
        >
          Order ID
          <ArrowUpDown className="ml-2 h-3 w-3 sm:h-4 sm:w-4" />
        </Button>
      )
    },
    cell: ({ row }: { row: any}) => (
      <div className="font-medium text-xs sm:text-sm">{row.getValue("order_id")?.slice(0, 8)}...</div>
    ),
  },
  {
    accessorKey: "customerName",
    header: "Customer",
    cell: ({ row }: { row: any}) => {
      const customer = row.original.cart_item?.user;
      if (!customer) return <div className="text-muted-foreground">N/A</div>;
      
      return (
        <div className="flex items-center gap-1 text-xs sm:text-sm">
          <User className="w-3 h-3 text-muted-foreground" />
          <div>
            <div className="font-medium">{customer.first_name} {customer.last_name}</div>
            <div className="text-xs text-muted-foreground">{customer.email}</div>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "product",
    header: "Product",
    cell: ({ row }: { row: any}) => {
      const product = row.original.cart_item?.product;
      if (!product) return <div className="text-muted-foreground">N/A</div>;
      
      return (
        <div className="flex items-center gap-1 text-xs sm:text-sm">
          <Package className="w-3 h-3 text-muted-foreground" />
          <div>
            <div className="font-medium">{product.name}</div>
            <div className="text-xs text-muted-foreground">₱{product.price}</div>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "shopName",
    header: "Shop",
    cell: ({ row }: { row: any}) => {
      const shop = row.original.cart_item?.product?.shop;
      if (!shop) return <div className="text-muted-foreground">N/A</div>;
      
      return (
        <div className="flex items-center gap-1 text-xs sm:text-sm">
          <Store className="w-3 h-3 text-muted-foreground" />
          <span>{shop.name}</span>
        </div>
      );
    },
  },

  {
    accessorKey: "total_amount",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="text-xs sm:text-sm"
        >
          Amount
          <ArrowUpDown className="ml-2 h-3 w-3 sm:h-4 sm:w-4" />
        </Button>
      )
    },
    cell: ({ row }: { row: any}) => (
      <div className="flex items-center gap-1 text-xs sm:text-sm">
        <PhilippinePeso className="w-3 h-3 text-muted-foreground" />
        ₱{row.getValue("total_amount")}
        {row.original.voucher && (
          <Badge variant="outline" className="ml-1 text-xs">
            -₱{row.original.voucher.value}
          </Badge>
        )}
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: "Item Status",
    cell: ({ row }: { row: any}) => {
      const status = row.getValue("status") as string;
      return <OrderStatusBadge status={status} />;
    },
  },
  {
    accessorKey: "order_status",
    header: "Order Status",
    cell: ({ row }: { row: any}) => {
      const status = row.getValue("order_status") as string;
      return <OrderStatusBadge status={status} />;
    },
  },
  {
    accessorKey: "order_created_at",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="text-xs sm:text-sm"
        >
          Created
          <ArrowUpDown className="ml-2 h-3 w-3 sm:h-4 sm:w-4" />
        </Button>
      )
    },
    cell: ({ row }: { row: any}) => {
      const date = new Date(row.getValue("order_created_at"));
      if (isNaN(date.getTime())) return <div className="text-muted-foreground">N/A</div>;
      
      const formattedDate = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
      
      return (
        <div className="flex items-center gap-1 text-xs sm:text-sm">
          <Calendar className="w-3 h-3 text-muted-foreground" />
          {formattedDate}
        </div>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const orderItem = row.original;
      const itemId = orderItem.id;
      const orderId = orderItem.order_id;
      const itemStatus = normalizeOrderStatus(orderItem.status);
      
      const handleAction = async (actionType: string) => {
        let reason = '';

        if (actionType === 'cancel' || actionType === 'reject' || actionType === 'refund') {
          reason = prompt(`Enter reason for ${actionType}:`) || '';
          if (!reason) {
            toast.error('Reason is required');
            return;
          }
        }

        try {
          // Get user ID from localStorage or global context
          const sessionUserId = localStorage.getItem('userId') || 
                               (window as any).user?.id || 
                               '';
          
          const payload = {
            order_id: orderId,
            order_item_id: itemId,
            action_type: actionType,
            user_id: sessionUserId,
            ...(reason && { reason })
          };

          const response = await AxiosInstance.put('/admin-orders/update_order_status/', payload);
          
          if (response.data.success || response.data.message) {
            toast.success(response.data.message || 'Order status updated successfully');
            // Trigger a page refresh or data reload
            window.location.reload();
          } else {
            toast.error(response.data.error || 'Failed to update order status');
          }
        } catch (error: any) {
          console.error('Error updating order status:', error);
          toast.error(error.response?.data?.error || 'Failed to update order status');
        }
      };

      // Function to determine available actions based on order state
      const getAvailableActions = () => {
        const actions = [];
        
        // Pending order items
        if (itemStatus === 'Pending') {
          actions.push({ label: 'Accept Order', action: 'accept', variant: 'default' as const });
          actions.push({ label: 'Reject Order', action: 'reject', variant: 'destructive' as const });
          actions.push({ label: 'Put On Hold', action: 'hold', variant: 'secondary' as const });
        }
        
        // Accepted/Pending payment orders
        if (itemStatus === 'Awaiting Payment') {
          actions.push({ label: 'Mark as Paid', action: 'mark_paid', variant: 'default' as const });
          actions.push({ label: 'Cancel Order', action: 'cancel', variant: 'destructive' as const });
        }
        
        // Paid orders
        if (itemStatus === 'Paid' || itemStatus === 'Completed') {
          actions.push({ label: 'Mark as Shipped', action: 'ship', variant: 'default' as const });
          actions.push({ label: 'Refund Order', action: 'refund', variant: 'destructive' as const });
        }
        
        // Shipped orders
        if (itemStatus === 'Shipped') {
          actions.push({ label: 'Mark as Delivered', action: 'deliver', variant: 'default' as const });
          actions.push({ label: 'Mark as Failed', action: 'fail_delivery', variant: 'destructive' as const });
        }
        
        // On Hold orders
        if (itemStatus === 'On Hold') {
          actions.push({ label: 'Resume Order', action: 'resume', variant: 'default' as const });
          actions.push({ label: 'Cancel Order', action: 'cancel', variant: 'destructive' as const });
        }
        
        // Cancelled orders
        if (itemStatus === 'Cancelled') {
          actions.push({ label: 'Restore Order', action: 'restore', variant: 'default' as const });
        }
        
        // Failed orders
        if (itemStatus === 'Failed') {
          actions.push({ label: 'Retry Order', action: 'retry', variant: 'default' as const });
          actions.push({ label: 'Refund Order', action: 'refund', variant: 'destructive' as const });
        }
        
        // Removed orders
        if (orderItem.is_removed || orderItem.order_is_removed) {
          actions.push({ label: 'Restore Order', action: 'restore_removed', variant: 'default' as const });
        }
        
        return actions;
      };

      const actions = getAvailableActions();

      return (
        <div className="flex items-center gap-2 px-2 sm:px-4 py-2">
          <Link 
            to={`/admin/orders/${orderId}`}
            className="text-primary hover:underline text-xs sm:text-sm flex items-center gap-1"
            title="View Order Details"
          >
            <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
          </Link>
          
          {actions.length > 0 && (
            <Select onValueChange={(value) => handleAction(value)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Actions" />
              </SelectTrigger>
              <SelectContent>
                {actions.map((action) => (
                  <SelectItem key={action.action} value={action.action}>
                    {action.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      );
    },
  },
];