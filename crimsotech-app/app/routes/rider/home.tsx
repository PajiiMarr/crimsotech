import type { Route } from "./+types/home"
import SidebarLayout from '~/components/layouts/sidebar'
import { UserProvider } from '~/components/providers/user-role-provider';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent, 
  CardDescription 
} from '~/components/ui/card';
import { DataTable } from '~/components/ui/data-table';
import { type ColumnDef } from "@tanstack/react-table"
import { Link } from 'react-router'
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { Skeleton } from '~/components/ui/skeleton';
import { 
  TrendingUp,
  TrendingDown,
  Clock,
  DollarSign,
  Package,
  MapPin,
  Award,
  Bike,
  Calendar,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Star,
  MoreHorizontal,
  ArrowUpDown,
  RefreshCw,
  BarChart3,
  Target
} from 'lucide-react';
import { useState, useEffect } from 'react';
import AxiosInstance from '~/components/axios/Axios';
import DateRangeFilter from '~/components/ui/date-range-filter'; // Import DateRangeFilter

export function meta(): Route.MetaDescriptors {
    return [
        {
            title: "Dashboard | Rider",
        }
    ]
}

// Define proper types based on Django models
interface DeliveryStats {
  id: string;  // UUID string
  order_id: string;  // Order UUID
  customer_name: string;
  pickup_location: string;
  delivery_location: string;
  status: 'pending' | 'picked_up' | 'delivered' | 'cancelled';  // Matches Django choices
  amount: number;  // From Order.total_amount
  distance_km?: number;  // Optional: not in original Django model
  estimated_minutes?: number;  // Optional: not in original Django model
  actual_minutes?: number;  // Optional: not in original Django model
  delivery_rating?: number;  // Optional: 1-5 stars
  picked_at?: string;
  delivered_at?: string;
  created_at: string;
}

interface RiderMetrics {
  total_deliveries: number;
  completed_deliveries: number;
  pending_deliveries: number;
  cancelled_deliveries: number;
  total_earnings: number;
  avg_delivery_time: number;
  avg_rating: number;
  on_time_percentage: number;
  current_week_deliveries: number;
  current_month_earnings: number;
  has_data: boolean;
  growth_metrics?: {
    deliveries_growth?: number;
    earnings_growth?: number;
    rating_growth?: number;
    previous_period_deliveries?: number;
    previous_period_earnings?: number;
    period_days?: number;
  };
}

interface LoaderData {
  user: any;
  riderMetrics: RiderMetrics | null;
  deliveryStats: DeliveryStats[];
  error?: string;
}

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

    // Get session for authentication
    const { getSession } = await import('~/sessions.server');
    const session = await getSession(request.headers.get("Cookie"));

    try {
      const userId = user?.id || user?.userId || user?.user_id;
      // Use AxiosInstance to fetch real data from API
      const response = await AxiosInstance.get('/rider-dashboard/rider_dashboard/', {
        'headers': {
            'X-User-Id': userId
        }
      });

      const data = response.data;
      
      return {
        user,
        riderMetrics: data.metrics,
        deliveryStats: data.deliveries || []
      };
      
    } catch (error: any) {
      console.error('Failed to fetch rider dashboard data:', error);
      
      // Return empty data structure on error
      return {
        user,
        riderMetrics: {
          total_deliveries: 0,
          completed_deliveries: 0,
          pending_deliveries: 0,
          cancelled_deliveries: 0,
          total_earnings: 0,
          avg_delivery_time: 0,
          avg_rating: 0,
          on_time_percentage: 0,
          current_week_deliveries: 0,
          current_month_earnings: 0,
          has_data: false,
          growth_metrics: {
            deliveries_growth: 0,
            earnings_growth: 0,
            rating_growth: 0,
            previous_period_deliveries: 0,
            previous_period_earnings: 0,
            period_days: 7
          }
        },
        deliveryStats: [],
        error: error.response?.data?.error || error.message || 'Failed to load dashboard data'
      };
    }
}

// Metrics Component
function RiderMetricsCard({ metrics, isLoading }: { metrics: RiderMetrics, isLoading: boolean }) {
  const formatPercentage = (value: number) => {
    if (value === undefined || value === null) return 'N/A';
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const growthMetrics = metrics.growth_metrics || {};

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Deliveries */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Deliveries</p>
              <p className="text-2xl font-bold mt-1">
                {isLoading ? '...' : metrics.total_deliveries}
              </p>
              {!isLoading && growthMetrics.deliveries_growth !== undefined && (
                <div className={`flex items-center gap-1 mt-2 text-sm ${
                  growthMetrics.deliveries_growth >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {growthMetrics.deliveries_growth >= 0 ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <TrendingDown className="w-4 h-4" />
                  )}
                  <span>{formatPercentage(growthMetrics.deliveries_growth)}</span>
                  <span className="text-xs text-muted-foreground">
                    vs previous {growthMetrics.period_days || 7} days
                  </span>
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-2">All time deliveries</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Total Earnings */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Earnings</p>
              <p className="text-2xl font-bold mt-1">
                {isLoading ? '...' : formatCurrency(metrics.total_earnings)}
              </p>
              {!isLoading && growthMetrics.earnings_growth !== undefined && (
                <div className={`flex items-center gap-1 mt-2 text-sm ${
                  growthMetrics.earnings_growth >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {growthMetrics.earnings_growth >= 0 ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <TrendingDown className="w-4 h-4" />
                  )}
                  <span>{formatPercentage(growthMetrics.earnings_growth)}</span>
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-2">Lifetime earnings</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Average Rating */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Average Rating</p>
              <p className="text-2xl font-bold mt-1">
                {isLoading ? '...' : 
                  metrics.avg_rating > 0 ? `${metrics.avg_rating.toFixed(1)}★` : 'No ratings'
                }
              </p>
              {!isLoading && growthMetrics.rating_growth !== undefined && (
                <div className={`flex items-center gap-1 mt-2 text-sm ${
                  growthMetrics.rating_growth >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {growthMetrics.rating_growth >= 0 ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <TrendingDown className="w-4 h-4" />
                  )}
                  <span>{formatPercentage(growthMetrics.rating_growth)}</span>
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-2">Customer satisfaction</p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-full">
              <Star className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* On-Time Percentage */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">On-Time Delivery</p>
              <p className="text-2xl font-bold mt-1">
                {isLoading ? '...' : `${metrics.on_time_percentage}%`}
              </p>
              <div className={`flex items-center gap-1 mt-2 text-sm ${
                metrics.on_time_percentage >= 90 ? 'text-green-600' : 
                metrics.on_time_percentage >= 80 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                <Clock className="w-4 h-4" />
                <span>
                  {metrics.on_time_percentage >= 90 ? 'Excellent' : 
                   metrics.on_time_percentage >= 80 ? 'Good' : 'Needs Improvement'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Timeliness rate</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <Clock className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status Breakdown Row */}
      <div className="col-span-1 md:col-span-2 lg:col-span-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="text-2xl font-bold mt-1 text-green-600">
                    {isLoading ? '...' : metrics.completed_deliveries}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">Successfully delivered</p>
                </div>
                <div className="p-3 bg-green-50 rounded-full">
                  <CheckCircle className="w-6 h-6 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold mt-1 text-blue-600">
                    {isLoading ? '...' : metrics.pending_deliveries}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">Awaiting pickup</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-full">
                  <Clock className="w-6 h-6 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Cancelled</p>
                  <p className="text-2xl font-bold mt-1 text-red-600">
                    {isLoading ? '...' : metrics.cancelled_deliveries}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">Failed deliveries</p>
                </div>
                <div className="p-3 bg-red-50 rounded-full">
                  <XCircle className="w-6 h-6 text-red-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Table columns definition
const columns: ColumnDef<DeliveryStats>[] = [
  {
    accessorKey: "order_id",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Order ID
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const orderId = row.getValue("order_id");
      const displayId = typeof orderId === 'string' ? orderId.slice(0, 8) + '...' : 'N/A';
      return (
        <div className="font-mono text-sm">{displayId}</div>
      );
    },
  },
  {
    accessorKey: "customer_name",
    header: "Customer",
    cell: ({ row }) => (
      <div className="font-medium">{row.getValue("customer_name")}</div>
    ),
  },
  {
    accessorKey: "pickup_location",
    header: "Pickup",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <MapPin className="w-4 h-4 text-blue-500" />
        <span className="truncate max-w-[200px]">{row.getValue("pickup_location")}</span>
      </div>
    ),
  },
  {
    accessorKey: "delivery_location",
    header: "Delivery",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <MapPin className="w-4 h-4 text-green-500" />
        <span className="truncate max-w-[200px]">{row.getValue("delivery_location")}</span>
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      const getStatusConfig = (status: string) => {
        switch (status) {
          case 'delivered':
            return { variant: 'default' as const, text: 'Delivered', icon: CheckCircle };
          case 'picked_up':
            return { variant: 'secondary' as const, text: 'In Progress', icon: Bike };
          case 'pending':
            return { variant: 'outline' as const, text: 'Pending', icon: Clock };
          case 'cancelled':
            return { variant: 'destructive' as const, text: 'Cancelled', icon: XCircle };
          default:
            return { variant: 'outline' as const, text: status, icon: AlertTriangle };
        }
      };
      
      const config = getStatusConfig(status);
      const Icon = config.icon;
      
      return (
        <Badge variant={config.variant} className="flex items-center gap-1">
          <Icon className="w-3 h-3" />
          {config.text}
        </Badge>
      );
    },
  },
  {
    accessorKey: "amount",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Amount
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("amount"))
      const formatted = new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP',
      }).format(amount)
      
      return (
        <div className="font-medium">
          {formatted}
        </div>
      )
    },
  },
  {
    accessorKey: "distance_km",
    header: "Distance",
    cell: ({ row }) => {
      const distance: number = row.getValue("distance_km")
      return distance ? (
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-gray-500" />
          <span>{distance} km</span>
        </div>
      ) : (
        <span className="text-muted-foreground text-sm">N/A</span>
      )
    },
  },
  {
    accessorKey: "delivery_rating",
    header: "Rating",
    cell: ({ row }) => {
      const rating: number = row.getValue("delivery_rating")
      return rating > 0 ? (
        <div className="flex items-center gap-1">
          <Star className="w-4 h-4 text-yellow-500 fill-current" />
          <span>{rating}</span>
        </div>
      ) : (
        <span className="text-muted-foreground text-sm">No rating</span>
      )
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const delivery = row.original
      return (
        <div className="flex items-center gap-2">
          <Link 
            to={`/rider/deliveries/${delivery.id}`}
            className="text-primary hover:underline"
          >
            View
          </Link>
          <Button variant="ghost" size="sm">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </div>
      )
    },
  },
];

export default function RiderStats({ loaderData}: { loaderData: LoaderData }){
    const { user, riderMetrics: initialMetrics, deliveryStats: initialStats, error } = loaderData;
    
    // State for managing data
    const [riderMetrics, setRiderMetrics] = useState(initialMetrics);
    const [deliveryStats, setDeliveryStats] = useState<DeliveryStats[]>(initialStats);
    const [isLoading, setIsLoading] = useState(false);
    const [dataError, setDataError] = useState<string | null>(error || null);
    const [dateRange, setDateRange] = useState({
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago (1 month)
      end: new Date(),
      rangeType: 'monthly' as 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'
    });

    // Filter config for the data table
    const deliveryFilterConfig = {
      status: {
        options: ['all', 'pending', 'picked_up', 'delivered', 'cancelled'],
        placeholder: 'Status'
      }
    };

    // Helper function to handle refresh with date filter
    const handleRefresh = async () => {
      setIsLoading(true);
      setDataError(null);
      
      try {
        const userId = user?.id || user?.userId || user?.user_id;
        
        if (!userId) {
          throw new Error('User ID not found');
        }

        // Add date range parameters to the API call
        const params = new URLSearchParams({
          start_date: dateRange.start.toISOString().split('T')[0], // YYYY-MM-DD
          end_date: dateRange.end.toISOString().split('T')[0],
        });

        // Fetch fresh data from API using AxiosInstance with date filter
        const response = await AxiosInstance.get(`/rider-dashboard/rider_dashboard/?${params}`, {
          headers: {
            'X-User-Id': userId
          }
        });

        const data = response.data;
        setRiderMetrics(data.metrics);
        setDeliveryStats(data.deliveries || []);
        
      } catch (error: any) {
        console.error('Failed to refresh data:', error);
        setDataError(error.response?.data?.error || error.message || 'Failed to refresh data');
      } finally {
        setIsLoading(false);
      }
    };

    // Handle date range change
    const handleDateRangeChange = (range: { start: Date; end: Date; rangeType: string }) => {
      setDateRange({
        start: range.start,
        end: range.end,
        rangeType: range.rangeType as 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'
      });
      
      // Automatically refresh data when date range changes
      handleRefresh();
    };

    // Show loading state if no data yet
    if (!riderMetrics) {
      return (
        <UserProvider user={user}>
          <SidebarLayout>
            <div className="space-y-6">
              <div className="flex justify-center items-center h-64">
                <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            </div>
          </SidebarLayout>
        </UserProvider>
      );
    }

    // Show error state
    if (dataError && !riderMetrics.has_data) {
      return (
        <UserProvider user={user}>
          <SidebarLayout>
            <div className="space-y-6">
              <Card>
                <CardContent className="p-6 text-center">
                  <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Unable to Load Dashboard</h3>
                  <p className="text-muted-foreground mb-4">{dataError}</p>
                  <Button onClick={handleRefresh}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Retry
                  </Button>
                </CardContent>
              </Card>
            </div>
          </SidebarLayout>
        </UserProvider>
      );
    }

    return (
        <UserProvider user={user}>
            <SidebarLayout>
                <div className="space-y-6">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold">Rider Dashboard</h1>
                            <p className="text-muted-foreground">Track your delivery performance and earnings</p>
                        </div>
                    </div>

                    {/* Date Range Filter */}
                    <DateRangeFilter 
                      onDateRangeChange={handleDateRangeChange}
                      isLoading={isLoading}
                    />

                    {dataError && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-yellow-800">
                          <AlertTriangle className="w-5 h-5" />
                          <span>{dataError}</span>
                        </div>
                      </div>
                    )}

                    {/* Metrics Section */}
                    <RiderMetricsCard metrics={riderMetrics} isLoading={isLoading} />

                    {/* Delivery Stats Table */}
                    <Card>
                      <CardHeader>
                        <div className="flex justify-between items-center">
                          <div>
                            <CardTitle>Delivery History</CardTitle>
                            <CardDescription>
                              Recent delivery activities and performance
                              <span className="ml-2 text-xs text-muted-foreground">
                                ({dateRange.start.toLocaleDateString()} - {dateRange.end.toLocaleDateString()})
                              </span>
                            </CardDescription>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {isLoading ? (
                              <div className="flex items-center gap-2">
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                Loading...
                              </div>
                            ) : (
                              `${deliveryStats.length} deliveries found`
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {isLoading ? (
                          <div className="space-y-3">
                            {[...Array(5)].map((_, i) => (
                              <Skeleton key={i} className="h-12 w-full" />
                            ))}
                          </div>
                        ) : deliveryStats.length > 0 ? (
                          <DataTable 
                            columns={columns} 
                            data={deliveryStats} 
                            filterConfig={deliveryFilterConfig}
                            searchConfig={{
                              column: "customer_name",
                              placeholder: "Search by customer name or order ID..."
                            }}
                          />
                        ) : (
                          <div className="text-center py-8">
                            <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-lg font-semibold mb-2">No Deliveries Found</h3>
                            <p className="text-muted-foreground">
                              No deliveries found for the selected date range.
                              {dateRange.start && dateRange.end && (
                                <span className="block text-sm mt-1">
                                  Try adjusting your date range or check back later.
                                </span>
                              )}
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Additional Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Performance Summary */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <BarChart3 className="w-5 h-5" />
                            Performance Summary
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div className="flex justify-between items-center">
                              <span className="text-muted-foreground">Avg. Delivery Time</span>
                              <span className="font-semibold">{riderMetrics.avg_delivery_time} mins</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-muted-foreground">Current Week Deliveries</span>
                              <span className="font-semibold">{riderMetrics.current_week_deliveries}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-muted-foreground">Month Earnings</span>
                              <span className="font-semibold">
                                ₱{riderMetrics.current_month_earnings.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-muted-foreground">Completion Rate</span>
                              <span className="font-semibold text-green-600">
                                {riderMetrics.total_deliveries > 0 
                                  ? ((riderMetrics.completed_deliveries / riderMetrics.total_deliveries) * 100).toFixed(1)
                                  : '0.0'}%
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Quick Actions */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Target className="w-5 h-5" />
                            Quick Actions
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 gap-3">
                            <Button variant="outline" className="flex flex-col h-auto py-4">
                              <Bike className="w-6 h-6 mb-2" />
                              <span>Start Shift</span>
                            </Button>
                            <Link to="/rider/deliveries" className="block">
                              <Button variant="outline" className="flex flex-col h-auto py-4 w-full">
                                <Package className="w-6 h-6 mb-2" />
                                <span>View Orders</span>
                              </Button>
                            </Link>
                            <Button variant="outline" className="flex flex-col h-auto py-4">
                              <DollarSign className="w-6 h-6 mb-2" />
                              <span>Withdraw</span>
                            </Button>
                            <Button variant="outline" className="flex flex-col h-auto py-4">
                              <Award className="w-6 h-6 mb-2" />
                              <span>Achievements</span>
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                </div>
            </SidebarLayout>
        </UserProvider>
    )
}