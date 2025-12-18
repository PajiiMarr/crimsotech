import type { Route } from "./+types/stats"
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

export function meta(): Route.MetaDescriptors {
    return [
        {
            title: "Stats | Riders",
        }
    ]
}

// Define proper types for our data
interface DeliveryStats {
  id: number;
  order_id: string;
  customer_name: string;
  pickup_location: string;
  delivery_location: string;
  status: string;
  amount: number;
  distance: number;
  estimated_time: number;
  actual_time: number;
  rating: number;
  completed_at?: string;
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
  riderMetrics: RiderMetrics;
  deliveryStats: DeliveryStats[];
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

    // In a real implementation, you would fetch data from your API
    // For now, return mock data
    const riderMetrics: RiderMetrics = {
      total_deliveries: 145,
      completed_deliveries: 132,
      pending_deliveries: 8,
      cancelled_deliveries: 5,
      total_earnings: 24500.75,
      avg_delivery_time: 35,
      avg_rating: 4.7,
      on_time_percentage: 88.5,
      current_week_deliveries: 24,
      current_month_earnings: 5200.50,
      has_data: true,
      growth_metrics: {
        deliveries_growth: 12.5,
        earnings_growth: 8.3,
        rating_growth: 2.1,
        previous_period_deliveries: 129,
        previous_period_earnings: 22600.25,
        period_days: 7
      }
    };

    const deliveryStats: DeliveryStats[] = [
      {
        id: 1,
        order_id: "ORD-2024-001234",
        customer_name: "Juan Dela Cruz",
        pickup_location: "SM Mall of Asia",
        delivery_location: "Makati CBD",
        status: "delivered",
        amount: 150.75,
        distance: 8.5,
        estimated_time: 40,
        actual_time: 35,
        rating: 5,
        completed_at: "2024-01-15 14:30:00"
      },
      {
        id: 2,
        order_id: "ORD-2024-001235",
        customer_name: "Maria Santos",
        pickup_location: "Greenbelt 5",
        delivery_location: "Bonifacio Global City",
        status: "in_progress",
        amount: 200.50,
        distance: 6.2,
        estimated_time: 35,
        actual_time: 0,
        rating: 0
      },
      {
        id: 3,
        order_id: "ORD-2024-001236",
        customer_name: "Robert Lim",
        pickup_location: "Trinoma Mall",
        delivery_location: "Quezon City Circle",
        status: "pending",
        amount: 180.25,
        distance: 12.3,
        estimated_time: 55,
        actual_time: 0,
        rating: 0
      },
      {
        id: 4,
        order_id: "ORD-2024-001237",
        customer_name: "Anna Garcia",
        pickup_location: "Robinsons Galleria",
        delivery_location: "Mandaluyong City",
        status: "delivered",
        amount: 220.00,
        distance: 5.8,
        estimated_time: 30,
        actual_time: 28,
        rating: 4,
        completed_at: "2024-01-15 11:15:00"
      },
      {
        id: 5,
        order_id: "ORD-2024-001238",
        customer_name: "Carlos Reyes",
        pickup_location: "Ayala Center Cebu",
        delivery_location: "Cebu Business Park",
        status: "cancelled",
        amount: 175.50,
        distance: 4.5,
        estimated_time: 25,
        actual_time: 0,
        rating: 0
      },
      {
        id: 6,
        order_id: "ORD-2024-001239",
        customer_name: "Sofia Tan",
        pickup_location: "Shangri-La Plaza",
        delivery_location: "Pasig City",
        status: "delivered",
        amount: 195.25,
        distance: 7.3,
        estimated_time: 38,
        actual_time: 42,
        rating: 3,
        completed_at: "2024-01-14 16:45:00"
      },
      {
        id: 7,
        order_id: "ORD-2024-001240",
        customer_name: "Miguel Lopez",
        pickup_location: "SM Megamall",
        delivery_location: "Ortigas Center",
        status: "delivered",
        amount: 165.75,
        distance: 3.8,
        estimated_time: 20,
        actual_time: 18,
        rating: 5,
        completed_at: "2024-01-14 10:20:00"
      }
    ];

    return { 
      user, 
      riderMetrics,
      deliveryStats 
    };
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
              <div className="flex items-center gap-1 mt-2 text-sm text-green-600">
                <Clock className="w-4 h-4" />
                <span>Excellent</span>
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
    cell: ({ row }) => (
      <div className="font-medium">{row.getValue("order_id")}</div>
    ),
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
          case 'in_progress':
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
    accessorKey: "distance",
    header: "Distance",
    cell: ({ row }) => {
      const distance: number = row.getValue("distance")
      return (
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-gray-500" />
          <span>{distance} km</span>
        </div>
      )
    },
  },
  {
    accessorKey: "rating",
    header: "Rating",
    cell: ({ row }) => {
      const rating: number = row.getValue("rating")
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
    const { user, riderMetrics: initialMetrics, deliveryStats: initialStats } = loaderData;
    
    // State for managing data
    const [riderMetrics, setRiderMetrics] = useState(initialMetrics);
    const [deliveryStats, setDeliveryStats] = useState<DeliveryStats[]>(initialStats);
    const [isLoading, setIsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('all');

    // Filter config for the data table
    const deliveryFilterConfig = {
      status: {
        options: ['all', 'pending', 'in_progress', 'delivered', 'cancelled'],
        placeholder: 'Status'
      }
    };

    return (
        <UserProvider user={user}>
            <SidebarLayout>
                <div className="space-y-6">
                    {/* Header */}
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold">Rider Dashboard</h1>
                            <p className="text-muted-foreground">Track your delivery performance and earnings</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline">
                            <Calendar className="w-4 h-4 mr-2" />
                            This Month
                          </Button>
                          <Button>
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Refresh
                          </Button>
                        </div>
                    </div>

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
                        ) : (
                          <DataTable 
                            columns={columns} 
                            data={deliveryStats} 
                            filterConfig={deliveryFilterConfig}
                            searchConfig={{
                              column: "customer_name",
                              placeholder: "Search by customer name or order ID..."
                            }}
                          />
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
                                {((riderMetrics.completed_deliveries / riderMetrics.total_deliveries) * 100).toFixed(1)}%
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
                            <Button variant="outline" className="flex flex-col h-auto py-4">
                              <Package className="w-6 h-6 mb-2" />
                              <span>View Orders</span>
                            </Button>
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