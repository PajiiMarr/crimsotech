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
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  CartesianGrid,
} from 'recharts';
import { 
  ShoppingCart,
  TrendingUp,
  Clock,
  ArrowUpDown,
  User,
  Package,
  Calendar,
  DollarSign,
  CreditCard,
  CheckCircle,
  XCircle,
  AlertCircle,
  Store,
} from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '~/components/ui/data-table';
import AxiosInstance from '~/components/axios/Axios';
import DateRangeFilter from '~/components/ui/date-range-filter';
import { useState, useEffect } from 'react';
import { useLoaderData, useNavigate, useSearchParams } from 'react-router';

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
    quantity: number;
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
  quantity: number;
  total_amount: number;
  status: string;
  created_at: string;
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
  };
  orders: Order[];
  dateRange: {
    start: string;
    end: string;
    rangeType: string;
  };
}

export async function loader({ request, context }: Route.LoaderArgs): Promise<LoaderData> {
  const { registrationMiddleware } = await import("~/middleware/registration.server");
  await registrationMiddleware({ request, context, params: {}, unstable_pattern: undefined } as any);

  const { requireRole } = await import("~/middleware/role-require.server");
  const { fetchUserRole } = await import("~/middleware/role.server");
  const { userContext } = await import("~/contexts/user-role");

  let user = (context as any).get(userContext);
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
  };

  let ordersList: Order[] = [];

  try {
    // Fetch real data from API with date range parameters
    const response = await AxiosInstance.get('/admin-orders/get_metrics/', {
      params: {
        start_date: validStart.toISOString(),
        end_date: validEnd.toISOString()
      },
      headers: {
        "X-User-Id": session.get("userId")
      }
    });

    if (response.data.success) {
      orderMetrics = response.data.metrics || orderMetrics;
      ordersList = response.data.orders || [];
    }
  } catch (error) {
    console.log('API fetch failed, using empty data fallback');
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

  // Flatten orders into individual items for the table
  const orderItems = safeOrders.flatMap(order => 
    order.items.map(item => ({
      ...item,
      order_id: order.order_id,
      order_user: order.user,
      payment_method: order.payment_method,
      delivery_address: order.delivery_address,
      order_created_at: order.created_at,
      order_status: order.status
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
                        <p className="text-xs text-muted-foreground mt-2">From all orders</p>
                      </div>
                      <div className="p-2 sm:p-3 bg-green-100 rounded-full">
                        <DollarSign className="w-4 h-4 sm:w-6 sm:h-6 text-green-600" />
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
    accessorKey: "quantity",
    header: "Qty",
    cell: ({ row }: { row: any}) => (
      <div className="text-xs sm:text-sm text-center">
        {row.original.cart_item?.quantity || 0}
      </div>
    ),
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
        <DollarSign className="w-3 h-3 text-muted-foreground" />
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
      const getColor = (status: string) => {
        switch(status?.toLowerCase()) {
          case 'completed': return '#10b981';
          case 'paid': return '#3b82f6';
          case 'pending': return '#f59e0b';
          case 'cancelled': return '#ef4444';
          case 'failed': return '#6b7280';
          default: return '#6b7280';
        }
      };
      const getIcon = (status: string) => {
        switch(status?.toLowerCase()) {
          case 'completed': return <CheckCircle className="w-3 h-3" />;
          case 'paid': return <DollarSign className="w-3 h-3" />;
          case 'pending': return <Clock className="w-3 h-3" />;
          case 'cancelled': return <XCircle className="w-3 h-3" />;
          case 'failed': return <AlertCircle className="w-3 h-3" />;
          default: return <AlertCircle className="w-3 h-3" />;
        }
      };
      const color = getColor(status);
      const icon = getIcon(status);
      
      return (
        <Badge 
          variant="secondary"
          className="text-xs capitalize flex items-center gap-1"
          style={{ backgroundColor: `${color}20`, color: color }}
        >
          {icon}
          {status || 'Unknown'}
        </Badge>
      );
    },
  },
  {
    accessorKey: "order_status",
    header: "Order Status",
    cell: ({ row }: { row: any}) => {
      const status = row.getValue("order_status") as string;
      const getColor = (status: string) => {
        switch(status?.toLowerCase()) {
          case 'completed': return '#10b981';
          case 'paid': return '#3b82f6';
          case 'pending': return '#f59e0b';
          case 'cancelled': return '#ef4444';
          case 'failed': return '#6b7280';
          default: return '#6b7280';
        }
      };
      const getIcon = (status: string) => {
        switch(status?.toLowerCase()) {
          case 'completed': return <CheckCircle className="w-3 h-3" />;
          case 'paid': return <DollarSign className="w-3 h-3" />;
          case 'pending': return <Clock className="w-3 h-3" />;
          case 'cancelled': return <XCircle className="w-3 h-3" />;
          case 'failed': return <AlertCircle className="w-3 h-3" />;
          default: return <AlertCircle className="w-3 h-3" />;
        }
      };
      const color = getColor(status);
      const icon = getIcon(status);
      
      return (
        <Badge 
          variant="secondary"
          className="text-xs capitalize flex items-center gap-1"
          style={{ backgroundColor: `${color}20`, color: color }}
        >
          {icon}
          {status || 'Unknown'}
        </Badge>
      );
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
];