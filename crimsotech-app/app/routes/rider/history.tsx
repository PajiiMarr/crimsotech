import type { Route } from "./+types/history"
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
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '~/components/ui/data-table';
import { Link } from 'react-router';
import { 
  Package,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  DollarSign,
  MapPin,
  User,
  Calendar,
  Truck,
  ArrowUpDown,
  Phone,
  Navigation,
  CreditCard,
  Star,
  History,
  BarChart3,
  Award,
  Filter,
  Download,
  Eye
} from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import AxiosInstance from '~/components/axios/Axios';
import DateRangeFilter from '~/components/ui/date-range-filter';

export function meta(): Route.MetaDescriptors {
    return [
        {
            title: "History | Rider",
        }
    ]
}

// Interface definitions matching Django models
interface OrderHistoryData {
  id: string;  // Delivery.id
  order_id: string;  // Order.order
  order_number: string;
  customer_name: string;
  customer_contact?: string;
  customer_email?: string;
  
  // Shipping address info
  pickup_location: string;
  delivery_location: string;
  recipient_name: string;
  recipient_phone: string;
  
  // Delivery details
  status: 'pending' | 'picked_up' | 'in_progress' | 'delivered' | 'cancelled';
  distance_km?: number;
  estimated_minutes?: number;
  actual_minutes?: number;
  delivery_rating?: number;
  notes?: string;
  
  // Order financials
  order_amount: number;
  delivery_fee?: number;
  payment_method: string;
  payment_status: 'success' | 'failed';
  
  // Shop information
  shop_name?: string;
  shop_contact?: string;
  
  // Timestamps
  order_created_at: string;
  picked_at?: string;
  delivered_at?: string;
  created_at: string;
  
  // Additional metadata
  items_count?: number;
  items_summary?: string;
  is_late?: boolean;
  time_elapsed?: string;
}

interface HistoryMetrics {
  total_deliveries: number;
  delivered_count: number;
  cancelled_count: number;
  total_earnings: number;
  avg_delivery_time: number;
  avg_rating: number;
  on_time_percentage: number;
  today_deliveries: number;
  week_earnings: number;
  has_data: boolean;
  growth_metrics?: {
    deliveries_growth?: number;
    earnings_growth?: number;
    rating_growth?: number;
  };
}

interface LoaderData {
    user: any;
}

export async function loader({ request, context}: Route.LoaderArgs): Promise<LoaderData> {
    const { registrationMiddleware } = await import("~/middleware/registration.server");
    await registrationMiddleware({ request, context, params: {}, unstable_pattern: undefined } as any);
    const { requireRole } = await import("~/middleware/role-require.server");
    const { fetchUserRole } = await import("~/middleware/role.server");
    const { userContext } = await import("~/contexts/user-role");

    let user = (context as any).get(userContext);
    if (!user) {
        user = await fetchUserRole({ request, context });
    }

    await requireRole(request, context, ["isRider"]);

    // Get session for authentication
    const { getSession } = await import('~/sessions.server');
    const session = await getSession(request.headers.get("Cookie"));

    return { user };
}

export default function OrderHistory({ loaderData}: { loaderData: LoaderData }){
    const { user } = loaderData;
    
    // State for data
    const [historyData, setHistoryData] = useState<OrderHistoryData[]>([]);
    const [metrics, setMetrics] = useState<HistoryMetrics>({
      total_deliveries: 0,
      delivered_count: 0,
      cancelled_count: 0,
      total_earnings: 0,
      avg_delivery_time: 0,
      avg_rating: 0,
      on_time_percentage: 0,
      today_deliveries: 0,
      week_earnings: 0,
      has_data: false
    });
    
    // State for loading and date range
    const [isLoading, setIsLoading] = useState(true);
    const [dateRange, setDateRange] = useState({
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      end: new Date(),
      rangeType: 'monthly' as 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'
    });

    // Fetch data function
    const fetchHistoryData = async () => {
      try {
        setIsLoading(true);
        
        const params = new URLSearchParams({
          start_date: dateRange.start.toISOString().split('T')[0],
          end_date: dateRange.end.toISOString().split('T')[0],
        });

        // Fetch history data
        const response = await AxiosInstance.get(`/rider-history/order_history/?${params}`, {
          headers: {
            'X-User-Id': user.user_id || user.id
          }
        });

        if (response.data) {
          setHistoryData(response.data.deliveries || []);
          setMetrics(response.data.metrics || {
            total_deliveries: 0,
            delivered_count: 0,
            cancelled_count: 0,
            total_earnings: 0,
            avg_delivery_time: 0,
            avg_rating: 0,
            on_time_percentage: 0,
            today_deliveries: 0,
            week_earnings: 0,
            has_data: false
          });
        }

      } catch (error) {
        console.error('Error fetching order history:', error);
        setHistoryData([]);
        setMetrics({
          total_deliveries: 0,
          delivered_count: 0,
          cancelled_count: 0,
          total_earnings: 0,
          avg_delivery_time: 0,
          avg_rating: 0,
          on_time_percentage: 0,
          today_deliveries: 0,
          week_earnings: 0,
          has_data: false
        });
      } finally {
        setIsLoading(false);
      }
    };

    // Initial data fetch
    useEffect(() => {
      fetchHistoryData();
    }, []);

    // Handle date range change
    const handleDateRangeChange = (range: { start: Date; end: Date; rangeType: string }) => {
      setDateRange({
        start: range.start,
        end: range.end,
        rangeType: range.rangeType as 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'
      });
    };

    // Prepare transformed data for the table
    const tableData = useMemo(() => {
      return historyData.map(delivery => ({
        id: delivery.id,
        order_id: delivery.order_id,
        order_number: delivery.order_number,
        customer_name: delivery.customer_name,
        customer_phone: delivery.customer_contact,
        pickup_location: delivery.pickup_location,
        delivery_location: delivery.delivery_location,
        recipient_name: delivery.recipient_name,
        recipient_phone: delivery.recipient_phone,
        amount: delivery.order_amount,
        delivery_fee: delivery.delivery_fee,
        payment_method: delivery.payment_method,
        payment_status: delivery.payment_status,
        status: delivery.status,
        distance_km: delivery.distance_km,
        estimated_minutes: delivery.estimated_minutes,
        actual_minutes: delivery.actual_minutes,
        delivery_rating: delivery.delivery_rating,
        order_created_at: delivery.order_created_at,
        picked_at: delivery.picked_at,
        delivered_at: delivery.delivered_at,
        created_at: delivery.created_at,
        items_count: delivery.items_count,
        items_summary: delivery.items_summary,
        is_late: delivery.is_late,
        time_elapsed: delivery.time_elapsed,
        shop_name: delivery.shop_name,
        // Keep original for actions
        original: delivery
      }));
    }, [historyData]);

    // Get filter options based on actual column IDs
    const getFilterOptions = () => {
      const statusOptions = [...new Set(historyData.map(d => d.status))].filter(Boolean);
      const paymentOptions = [...new Set(historyData.map(d => d.payment_method))].filter(Boolean);
      const ratingOptions = ['1', '2', '3', '4', '5'];
      
      return {
        status: {
          options: statusOptions,
          placeholder: 'Delivery Status',
          columnId: 'status'
        },
        payment_method: {
          options: paymentOptions,
          placeholder: 'Payment Method',
          columnId: 'payment_method'
        },
        delivery_rating: {
          options: ratingOptions,
          placeholder: 'Rating',
          columnId: 'delivery_rating'
        }
      };
    };

    // Loading skeleton for metrics
    const MetricCardSkeleton = () => (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-8 w-16 mt-1" />
              <Skeleton className="h-3 w-24 mt-2" />
            </div>
            <Skeleton className="w-12 h-12 rounded-full" />
          </div>
        </CardContent>
      </Card>
    );

    // Format currency
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP',
        minimumFractionDigits: 2
      }).format(amount);
    };

    // Format time
    const formatTime = (minutes?: number) => {
      if (!minutes) return 'N/A';
      const hours = Math.floor(minutes / 60);
      const mins = Math.round(minutes % 60);
      return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    };

    // Columns definition
    const columns: ColumnDef<any>[] = [
      {
        accessorKey: "order_number",
        id: "order_number",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="text-sm"
          >
            Order ID
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }: { row: any}) => (
          <div className="font-mono text-sm">
            #{row.getValue("order_number")?.slice(0, 8).toUpperCase() || 'N/A'}
          </div>
        ),
      },
      {
        accessorKey: "customer_name",
        id: "customer_name",
        header: "Customer",
        cell: ({ row }: { row: any}) => {
          const customerPhone = row.original.customer_phone;
          return (
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {row.getValue("customer_name")}
                </span>
              </div>
              {customerPhone && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Phone className="w-3 h-3" />
                  {customerPhone}
                </div>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "delivery_location",
        id: "delivery_location",
        header: "Delivery Address",
        cell: ({ row }: { row: any}) => {
          const recipientPhone = row.original.recipient_phone;
          const recipientName = row.original.recipient_name;
          return (
            <div className="space-y-1 max-w-[200px]">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div className="text-sm line-clamp-2">
                  {row.getValue("delivery_location")}
                </div>
              </div>
              {recipientName && (
                <div className="text-xs text-muted-foreground">
                  To: {recipientName}
                </div>
              )}
              {recipientPhone && (
                <div className="text-xs text-muted-foreground">
                  Contact: {recipientPhone}
                </div>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "status",
        id: "status",
        header: "Status",
        cell: ({ row }: { row: any}) => {
          const status = row.getValue("status");
          const deliveredAt = row.original.delivered_at;
          
          const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: any }> = {
            pending: { label: "Pending", variant: "outline", icon: Clock },
            picked_up: { label: "Picked Up", variant: "secondary", icon: Package },
            in_progress: { label: "In Progress", variant: "secondary", icon: Truck },
            delivered: { label: "Delivered", variant: "default", icon: CheckCircle },
            cancelled: { label: "Cancelled", variant: "destructive", icon: AlertCircle }
          };
          
          const config = statusConfig[status] || { label: status, variant: "outline", icon: AlertCircle };
          const Icon = config.icon;
          
          return (
            <div className="space-y-2">
              <Badge variant={config.variant} className="flex items-center gap-1">
                <Icon className="w-3 h-3" />
                {config.label}
              </Badge>
              {deliveredAt && (
                <div className="text-xs text-muted-foreground">
                  {new Date(deliveredAt).toLocaleDateString()}
                </div>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "amount",
        id: "amount",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="text-sm"
          >
            Amount
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }: { row: any}) => (
          <div className="space-y-1">
            <div className="font-bold text-sm">
              {formatCurrency(row.getValue("amount"))}
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <CreditCard className="w-3 h-3" />
              {row.original.payment_method || 'N/A'}
            </div>
          </div>
        ),
      },
      {
        accessorKey: "delivery_rating",
        id: "delivery_rating",
        header: "Rating",
        cell: ({ row }: { row: any}) => {
          const rating: number = row.getValue("delivery_rating");
          return rating > 0 ? (
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star 
                  key={i} 
                  className={`w-4 h-4 ${i < rating ? 'text-yellow-500 fill-current' : 'text-gray-300'}`} 
                />
              ))}
              <span className="text-sm ml-1">{rating}</span>
            </div>
          ) : (
            <span className="text-muted-foreground text-sm">No rating</span>
          );
        },
      },
      {
        accessorKey: "actual_minutes",
        id: "actual_minutes",
        header: "Delivery Time",
        cell: ({ row }: { row: any}) => {
          const actual = row.getValue("actual_minutes");
          const estimated = row.original.estimated_minutes;
          const isLate = row.original.is_late;
          
          return (
            <div className="space-y-1">
              <div className="text-sm">
                {actual ? formatTime(actual) : 'N/A'}
              </div>
              {estimated && (
                <div className="text-xs text-muted-foreground">
                  Est: {formatTime(estimated)}
                </div>
              )}
              {isLate && (
                <Badge variant="destructive" className="mt-1 text-xs">
                  Late
                </Badge>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "delivered_at",
        id: "delivered_at",
        header: "Delivered Date",
        cell: ({ row }: { row: any}) => {
          const deliveredAt = row.getValue("delivered_at");
          return deliveredAt ? (
            <div className="text-sm">
              {new Date(deliveredAt).toLocaleDateString()}
              <div className="text-xs text-muted-foreground">
                {new Date(deliveredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          ) : (
            <span className="text-muted-foreground text-sm">-</span>
          );
        },
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }: { row: any}) => {
          const delivery = row.original.original;
          return (
            <div className="flex items-center gap-2">
              <Button 
                size="sm" 
                variant="ghost" 
                className="text-xs"
                asChild
              >
                <Link to={`/rider/deliveries/${delivery.id}`}>
                  <Eye className="w-3 h-3 mr-1" />
                  View
                </Link>
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                className="text-xs"
                asChild
              >
                <Link to={`/rider/orders/${delivery.order_id}`}>
                  <Navigation className="w-3 h-3 mr-1" />
                  Details
                </Link>
              </Button>
            </div>
          );
        },
      },
    ];

    // Refresh data when date range changes
    useEffect(() => {
      fetchHistoryData();
    }, [dateRange]);

    return (
        <UserProvider user={user}>
            <SidebarLayout>
                <div className="space-y-6">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold">Order History</h1>
                            <p className="text-muted-foreground mt-1">Track your past deliveries and performance</p>
                        </div>
                    </div>

                    <DateRangeFilter 
                      onDateRangeChange={handleDateRangeChange}
                      isLoading={isLoading}
                    />

                    {/* Key Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                                  <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <p className="text-sm text-muted-foreground">Total Deliveries</p>
                                        <p className="text-2xl font-bold mt-1">{metrics.total_deliveries}</p>
                                        <div className="flex gap-2 text-xs text-muted-foreground mt-2">
                                          <span className="flex items-center gap-1">
                                            <CheckCircle className="w-3 h-3 text-green-500" /> {metrics.delivered_count} delivered
                                          </span>
                                          <span className="flex items-center gap-1">
                                            <AlertCircle className="w-3 h-3 text-red-500" /> {metrics.cancelled_count} cancelled
                                          </span>
                                        </div>
                                      </div>
                                      <div className="p-3 bg-blue-100 rounded-full">
                                        <History className="w-6 h-6 text-blue-600" />
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>

                                <Card>
                                  <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <p className="text-sm text-muted-foreground">Total Earnings</p>
                                        <p className="text-2xl font-bold mt-1">
                                          {formatCurrency(metrics.total_earnings)}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-2">
                                          {formatCurrency(metrics.week_earnings)} this week
                                        </p>
                                      </div>
                                      <div className="p-3 bg-green-100 rounded-full">
                                        <DollarSign className="w-6 h-6 text-green-600" />
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>

                                <Card>
                                  <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <p className="text-sm text-muted-foreground">Avg Rating</p>
                                        <p className="text-2xl font-bold mt-1">
                                          {metrics.avg_rating > 0 ? `${metrics.avg_rating.toFixed(1)}★` : 'No ratings'}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-2">
                                          {metrics.on_time_percentage}% on-time delivery
                                        </p>
                                      </div>
                                      <div className="p-3 bg-yellow-100 rounded-full">
                                        <Star className="w-6 h-6 text-yellow-600" />
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>

                                <Card>
                                  <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <p className="text-sm text-muted-foreground">Performance</p>
                                        <p className="text-2xl font-bold mt-1">
                                          {formatTime(metrics.avg_delivery_time)}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-2">
                                          {metrics.today_deliveries} deliveries today
                                        </p>
                                      </div>
                                      <div className="p-3 bg-purple-100 rounded-full">
                                        <BarChart3 className="w-6 h-6 text-purple-600" />
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                            </>
                        )}
                    </div>

                    {/* Delivery History Table */}
                    <Card>
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-center">
                          <div>
                            <CardTitle className="text-xl">Delivery History</CardTitle>
                            <CardDescription>
                              {isLoading ? 'Loading history...' : `Showing ${historyData.length} deliveries from ${dateRange.start.toLocaleDateString()} to ${dateRange.end.toLocaleDateString()}`}
                            </CardDescription>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {!isLoading && `${metrics.delivered_count} completed deliveries`}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="rounded-md">
                          <DataTable 
                            columns={columns} 
                            data={tableData}
                            filterConfig={getFilterOptions()}
                            searchConfig={{
                              column: "order_number",
                              placeholder: "Search by order ID or customer name..."
                            }}
                            isLoading={isLoading}
                          />
                        </div>
                      </CardContent>
                    </Card>
                </div>
            </SidebarLayout>
        </UserProvider>
    )
}